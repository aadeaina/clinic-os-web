"""Specialist agents.

Each agent carries a system prompt (where behavioral guardrails live) and a scoped tool
set. The mock provider drives turns deterministically; the real provider uses
build_messages()/tool_specs() to run an Anthropic tool-use turn.
"""
from __future__ import annotations

from orchestration.tools.registry import tools_for


class SpecialistAgent:
    key: str = ""
    system_prompt: str = ""

    def tools(self):
        return tools_for(self.key)

    def tool_specs(self) -> list[dict]:
        return [{"name": t.name, "description": t.description, "input_schema": t.input_schema}
                for t in self.tools()]

    def build_messages(self, user_text: str, tools_called: list[str],
                       tool_outputs: list[dict]) -> list[dict]:
        """Assemble the message list for a real provider turn (redacted text only)."""
        msgs: list[dict] = [{"role": "user", "content": user_text}]
        for name, out in zip(tools_called, tool_outputs):
            msgs.append({"role": "assistant",
                         "content": [{"type": "tool_use", "id": name, "name": name, "input": {}}]})
            msgs.append({"role": "user",
                         "content": [{"type": "tool_result", "tool_use_id": name,
                                      "content": str(out)}]})
        return msgs


class SchedulingAgent(SpecialistAgent):
    key = "scheduling"
    system_prompt = (
        "You help patients book, reschedule, and cancel appointments. Confirm the specifics "
        "(provider, date, time) back to the patient in plain language before proposing a "
        "booking. Never claim an appointment is booked until it is confirmed."
    )


class IntakeAgent(SpecialistAgent):
    key = "intake"
    system_prompt = (
        "You collect structured, EHR-ready intake information. Ask for one field at a time, "
        "validate required fields, and never invent data the patient did not provide."
    )


class TriageAgent(SpecialistAgent):
    key = "triage"
    system_prompt = (
        "You assess URGENCY ONLY and route the patient appropriately. You must NOT diagnose, "
        "suggest medications or dosing, or recommend treatment. For any red-flag symptom, "
        "direct the patient to emergency care immediately."
    )


class BillingAgent(SpecialistAgent):
    key = "billing"
    system_prompt = (
        "You answer insurance, coverage, and balance questions using the patient's records. "
        "You are read-mostly; any change to billing requires explicit confirmation."
    )


class SmalltalkAgent(SpecialistAgent):
    key = "smalltalk"
    system_prompt = "You greet the patient warmly and ask how you can help with their care."


_AGENTS = {a.key: a for a in [
    SchedulingAgent(), IntakeAgent(), TriageAgent(), BillingAgent(), SmalltalkAgent()
]}


def build_agent(agent_key: str) -> SpecialistAgent:
    return _AGENTS.get(agent_key, _AGENTS["smalltalk"])
