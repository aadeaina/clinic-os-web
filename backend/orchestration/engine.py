"""Orchestration engine.

`run_turn` streams a conversation event through redaction -> routing -> a specialist
agent's tool-use loop, applying guardrails and the two-phase write gate, yielding one
StepEvent per step. `confirm` commits a previously-proposed write.

The engine is a synchronous generator so it can be tested with the stdlib and streamed by a
Django StreamingHttpResponse without an event loop.
"""
from __future__ import annotations

from typing import Iterator

from core.redaction import redact
from integrations.ehr.base import EHRAdapter
from . import guardrails
from .agents import build_agent
from .router import route
from .schemas import (
    ConversationEvent, StepEvent, ev_routing, ev_agent_msg, ev_tool_use,
    ev_tool_result, ev_pending, ev_escalate, ev_final,
)
from .store import SessionStore
from .tools.base import ToolContext
from .tools.registry import tool_by_name


def _ctx(ehr: EHRAdapter, clinic_id: str, patient_ref: str, rehydrate) -> ToolContext:
    return ToolContext(ehr=ehr, clinic_id=clinic_id, patient_ref=patient_ref, rehydrate=rehydrate)


def run_turn(event: ConversationEvent, *, provider, store: SessionStore,
             ehr: EHRAdapter) -> Iterator[StepEvent]:
    event.validate()
    red = redact(event.text)

    session_id = store.create_or_get_session(
        event.clinic_id, event.channel, event.patient_ref, event.session_id)
    store.add_message(session_id, "patient", red.text)
    store.audit(session_id, "message_in", event.patient_ref, red.text)

    # ---- route (fast model, redacted text only) ----
    decision = route(provider, red.text, history=[])
    store.save_routing(session_id, decision)
    store.audit(session_id, "routing", session_id, decision.to_dict())
    yield ev_routing(decision)

    if decision.urgent or decision.intent == "escalate":
        reason = "urgent_symptom" if decision.urgent else "router_escalation"
        store.set_status(session_id, "escalated")
        store.set_contained(session_id, False)
        store.audit(session_id, "escalate", session_id, {"reason": reason})
        yield ev_escalate(reason)
        return

    agent_key = decision.agent or "smalltalk"
    agent = build_agent(agent_key)
    ctx = _ctx(ehr, event.clinic_id, event.patient_ref, red.rehydrate)

    tools_called: list[str] = []
    tool_outputs: list[dict] = []

    for _ in range(guardrails.MAX_TOOL_ITERATIONS):
        action = provider.agent_next(agent_key, red.text, tools_called, tool_outputs)

        if action.kind == "final":
            text = action.text or ""
            if guardrails.scan_output(text):
                text = "[redacted]"
            store.add_message(session_id, "agent", text)
            store.set_status(session_id, "resolved")
            store.set_contained(session_id, True)
            yield ev_agent_msg(agent_key, text)
            yield ev_final(text, contained=True)
            return

        # action.kind == "tool"
        tool = tool_by_name(agent_key, action.tool)
        if tool is None:
            store.set_status(session_id, "escalated")
            store.set_contained(session_id, False)
            yield ev_escalate("unknown_tool")
            return

        try:
            guardrails.validate_tool_input(tool, action.tool_input or {})
        except ValueError:
            store.set_status(session_id, "escalated")
            store.set_contained(session_id, False)
            yield ev_escalate("invalid_tool_input")
            return

        yield ev_tool_use(tool.name, action.tool_input or {})

        if tool.requires_confirmation:
            # Two-phase write: propose only. No mutation until /confirm.
            summary = tool.preview(action.tool_input or {}, ctx)
            action_id = store.create_pending(session_id, agent_key, tool.name,
                                              action.tool_input or {}, summary)
            store.audit(session_id, "pending", action_id, {"action": tool.name, "summary": summary})
            yield ev_pending(tool.name, action_id, summary)
            closing = f"{summary}? Confirm and I'll lock it in."
            store.add_message(session_id, "agent", closing)
            store.set_contained(session_id, True)
            yield ev_final(closing, contained=True)
            return

        # Non-confirm tool: execute now.
        output = tool.run(action.tool_input or {}, ctx)
        store.record_tool_call(session_id, tool.name, action.tool_input or {}, output)
        store.audit(session_id, "tool_call", tool.name, {"input": action.tool_input, "ok": True})
        yield ev_tool_result(tool.name, output)
        tools_called.append(tool.name)
        tool_outputs.append(output)

    # Loop budget exhausted without resolution.
    store.set_status(session_id, "escalated")
    store.set_contained(session_id, False)
    yield ev_escalate("max_iterations")


def confirm(session_id: str, action_id: str, *, store: SessionStore,
            ehr: EHRAdapter) -> Iterator[StepEvent]:
    pending = store.get_pending(action_id)
    if (not pending or pending["state"] != "pending"
            or str(pending["session_id"]) != str(session_id)):
        # Either unknown/already-used, or it belongs to a different session — treat both
        # the same way so this endpoint can't be used to probe for valid action ids.
        yield ev_escalate("invalid_or_used_confirmation")
        return

    session = store.get_session(session_id) or {}
    sess_patient = session.get("patient_ref", "patient")
    tool = tool_by_name(pending["agent_key"], pending["name"])
    if tool is None:
        store.set_status(session_id, "escalated")
        store.set_contained(session_id, False)
        yield ev_escalate("unknown_tool")
        return
    ctx = _ctx(ehr, session.get("clinic_id", ""), sess_patient, lambda s: s)

    output = tool.run(pending["args"], ctx)
    store.record_tool_call(session_id, tool.name, pending["args"], output)
    store.mark_pending_committed(action_id)
    store.audit(session_id, "write_committed", tool.name, {"output_keys": list(output.keys())})
    yield ev_tool_result(tool.name, output)

    confirmed = f"Confirmed — {pending['summary']}."
    store.add_message(session_id, "agent", confirmed)
    store.set_status(session_id, "resolved")
    store.set_contained(session_id, True)
    yield ev_final(confirmed, contained=True)
