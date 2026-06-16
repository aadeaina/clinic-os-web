"""Framework-agnostic data structures shared across the orchestration core.

These are pure-Python dataclasses (no Django, no third-party deps) so the engine,
router, agents, guardrails and tools can be unit-tested without a web framework.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any, Optional


def new_id() -> str:
    return str(uuid.uuid4())


def now() -> float:
    return time.time()


# Channels a conversation event can arrive on.
CHANNELS = ("voice", "sms", "web", "whatsapp", "app")

# Intents the router may emit.
INTENTS = ("scheduling", "intake", "triage", "billing", "smalltalk", "escalate")

# intent -> agent key (None means no specialist agent runs).
INTENT_TO_AGENT = {
    "scheduling": "scheduling",
    "intake": "intake",
    "triage": "triage",
    "billing": "billing",
    "smalltalk": "smalltalk",
    "escalate": None,
}


@dataclass
class ConversationEvent:
    """Channel-agnostic inbound message. `patient_ref` is an opaque token, never raw PII."""
    clinic_id: str
    channel: str
    patient_ref: str
    text: str
    session_id: Optional[str] = None
    metadata: dict = field(default_factory=dict)

    def validate(self) -> None:
        if self.channel not in CHANNELS:
            raise ValueError(f"unknown channel: {self.channel}")
        if not self.text or not self.text.strip():
            raise ValueError("empty text")


@dataclass
class RoutingDecision:
    intent: str
    agent: Optional[str]
    confidence: float
    urgent: bool
    rationale: str

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class StepEvent:
    """One streamed step. `type` discriminates the payload (see API/SSE contract)."""
    type: str  # routing | agent_msg | tool_use | tool_result | pending | escalate | final
    data: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {"type": self.type, **self.data}


# Convenience constructors for the streamed step types -----------------------

def ev_routing(d: RoutingDecision) -> StepEvent:
    return StepEvent("routing", {"decision": d.to_dict()})


def ev_agent_msg(agent: str, text: str) -> StepEvent:
    return StepEvent("agent_msg", {"agent": agent, "text": text})


def ev_tool_use(tool: str, _input: dict) -> StepEvent:
    return StepEvent("tool_use", {"tool": tool, "input": _input})


def ev_tool_result(tool: str, output: dict) -> StepEvent:
    return StepEvent("tool_result", {"tool": tool, "output": output})


def ev_pending(action: str, action_id: str, summary: str) -> StepEvent:
    return StepEvent("pending", {"action": action, "action_id": action_id, "summary": summary})


def ev_escalate(reason: str) -> StepEvent:
    return StepEvent("escalate", {"reason": reason})


def ev_final(text: str, contained: bool) -> StepEvent:
    return StepEvent("final", {"text": text, "contained": contained})
