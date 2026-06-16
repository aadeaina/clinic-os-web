"""LLM provider abstraction.

Three providers behind one interface:
  - mock     : deterministic, no network, no key. Default when ANTHROPIC_API_KEY is unset.
               Lets the entire routing -> agent -> tool -> confirm loop run and be tested offline.
  - anthropic: Anthropic first-party API (HIPAA-ready org for PHI).
  - bedrock  : Claude on Amazon Bedrock (inference inside your VPC under the AWS BAA).

The engine only ever calls `route()` and `agent_next()`. Redaction has already run upstream,
so providers must never receive raw PHI.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Optional

from .schemas import RoutingDecision

ROUTER_MODEL = os.environ.get("ROUTER_MODEL", "claude-haiku-4-5")
AGENT_MODEL = os.environ.get("AGENT_MODEL", "claude-sonnet-4-6")


@dataclass
class AgentAction:
    """The next thing a specialist agent wants to do."""
    kind: str                      # "tool" | "final"
    tool: Optional[str] = None
    tool_input: Optional[dict] = None
    text: Optional[str] = None


# --------------------------------------------------------------------------- mock

_URGENT = (
    "chest pain", "short of breath", "shortness of breath", "can't breathe", "cant breathe",
    "heart attack", "stroke", "unconscious", "severe bleeding", "bleeding badly",
    "suicidal", "overdose", "anaphyl", "seizure",
)
_TRIAGE = ("symptom", "rash", "cough", "fever", "sore throat", "sick", "dizzy", "nausea", "cold")
_SCHEDULING = ("book", "appointment", "schedule", "reschedule", "cancel", "availability",
               "slot", "follow-up", "follow up", "see the doctor", "see a doctor")
_BILLING = ("bill", "balance", "charge", "invoice", "copay", "co-pay", "owe", "payment", "pay my")
_INTAKE = ("intake", "new patient", "register", "forms", "paperwork", "update my info",
           "insurance card", "verify insurance")


class MockProvider:
    name = "mock"

    def route(self, user_text: str, history: list[dict]) -> RoutingDecision:
        t = user_text.lower()
        if any(k in t for k in _URGENT):
            return RoutingDecision("triage", "triage", 0.98, True,
                                   "red-flag symptom detected")
        if any(k in t for k in _SCHEDULING):
            return RoutingDecision("scheduling", "scheduling", 0.92, False, "booking intent")
        if any(k in t for k in _BILLING):
            return RoutingDecision("billing", "billing", 0.9, False, "billing intent")
        if any(k in t for k in _INTAKE):
            return RoutingDecision("intake", "intake", 0.88, False, "intake intent")
        if any(k in t for k in _TRIAGE):
            return RoutingDecision("triage", "triage", 0.85, False, "non-urgent symptom")
        return RoutingDecision("smalltalk", "smalltalk", 0.6, False, "no actionable intent")

    def agent_next(self, agent_key: str, user_text: str,
                   tools_called: list[str], tool_outputs: list[dict]) -> AgentAction:
        if agent_key == "scheduling":
            if "check_availability" not in tools_called:
                return AgentAction("tool", "check_availability",
                                   {"date_range": "next_7_days"})
            if "book_appointment" not in tools_called:
                slot = (tool_outputs[-1].get("slots") or [{}])[0]
                return AgentAction("tool", "book_appointment",
                                   {"slot_id": slot.get("id", "slot_1")})
            return AgentAction("final", text="You're all set.")

        if agent_key == "intake":
            if "start_intake" not in tools_called:
                return AgentAction("tool", "start_intake", {})
            return AgentAction("final",
                               text="I've started your intake and saved your reason for visit. "
                                    "Front desk will confirm the rest at check-in.")

        if agent_key == "billing":
            if "lookup_coverage" not in tools_called:
                return AgentAction("tool", "lookup_coverage", {})
            out = tool_outputs[-1] if tool_outputs else {}
            return AgentAction("final",
                               text=f"Your plan is {out.get('plan', 'on file')} and your visit "
                                    f"copay is {out.get('copay', 'unavailable')}. Anything else?")

        if agent_key == "triage":  # non-urgent only; urgent never reaches an agent
            if "assess_urgency" not in tools_called:
                return AgentAction("tool", "assess_urgency", {})
            return AgentAction("final",
                               text="This sounds non-urgent. I can connect you with a nurse line "
                                    "or book a visit — I can't diagnose or recommend treatment.")

        return AgentAction("final", text="How can I help with your care today?")


# ----------------------------------------------------------------- anthropic / bedrock

_ROUTER_SYS = (
    "You are an intent router for a clinic's patient-operations system. "
    "Classify the patient message into exactly one intent and return JSON only, no prose.\n"
    'Schema: {"intent": "scheduling|intake|triage|billing|smalltalk|escalate", '
    '"agent": "scheduling|intake|triage|billing|null", "confidence": 0.0-1.0, '
    '"urgent": true|false, "rationale": "short"}\n'
    "Set urgent=true and intent=triage for any red-flag symptom (chest pain, trouble breathing, "
    "stroke signs, severe bleeding, suicidal ideation, overdose)."
)


def _parse_routing(raw: str) -> RoutingDecision:
    try:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        d = json.loads(m.group(0))
        return RoutingDecision(
            intent=d["intent"], agent=d.get("agent") or None,
            confidence=float(d.get("confidence", 0.0)),
            urgent=bool(d.get("urgent", False)),
            rationale=str(d.get("rationale", "")),
        )
    except Exception:
        # Fail safe: anything we can't parse goes to a human.
        return RoutingDecision("escalate", None, 0.0, False, "router parse failure")


class _AnthropicBase:
    """Shared logic for Anthropic-API and Bedrock providers (same Messages API shape)."""
    name = "anthropic"

    def __init__(self, client):
        self._client = client

    def route(self, user_text: str, history: list[dict]) -> RoutingDecision:
        resp = self._client.messages.create(
            model=ROUTER_MODEL, max_tokens=200, system=_ROUTER_SYS,
            messages=[{"role": "user", "content": user_text}],
        )
        text = "".join(b.text for b in resp.content if b.type == "text")
        return _parse_routing(text)

    def agent_next(self, agent_key, user_text, tools_called, tool_outputs) -> AgentAction:
        # Real tool-use loop lives in the engine, which feeds prior tool results back in as
        # tool_result content blocks. Here we issue one model turn and translate its first
        # tool_use (or text) into an AgentAction. See orchestration/agents/base.py for the
        # transcript assembly. Implemented for completeness; exercised when a key is configured.
        from .agents import build_agent  # local import to avoid cycle
        agent = build_agent(agent_key)
        messages = agent.build_messages(user_text, tools_called, tool_outputs)
        resp = self._client.messages.create(
            model=AGENT_MODEL, max_tokens=1024, system=agent.system_prompt,
            tools=agent.tool_specs(), messages=messages,
        )
        for block in resp.content:
            if block.type == "tool_use":
                return AgentAction("tool", block.name, dict(block.input))
        text = "".join(b.text for b in resp.content if b.type == "text")
        return AgentAction("final", text=text or "How can I help?")


def get_provider():
    provider = os.environ.get("LLM_PROVIDER", "").lower()
    has_key = bool(os.environ.get("ANTHROPIC_API_KEY"))

    if provider == "anthropic" or (provider == "" and has_key):
        import anthropic
        return _AnthropicBase(anthropic.Anthropic())

    if provider == "bedrock":
        from anthropic import AnthropicBedrock
        b = _AnthropicBase(AnthropicBedrock())
        b.name = "bedrock"
        return b

    return MockProvider()
