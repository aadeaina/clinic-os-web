"""Offline demo — runs the engine with the mock provider and prints streamed steps.

    python3 demo.py

No Django, no network, no API key required. Demonstrates the scheduling two-phase
confirm and the urgent-triage escalation end to end.
"""
import json

from integrations.ehr.mock import MockEHRAdapter
from orchestration import engine
from orchestration.llm import MockProvider
from orchestration.schemas import ConversationEvent
from orchestration.store import InMemorySessionStore


def show(title, steps):
    print(f"\n=== {title} ===")
    for s in steps:
        d = s.to_dict()
        print(json.dumps(d))
    return [s.to_dict() for s in steps]


def main():
    ehr = MockEHRAdapter()
    store = InMemorySessionStore()
    provider = MockProvider()

    # 1) Scheduling: propose -> confirm
    ev = ConversationEvent("c1", "app", "ptok_1", "I need to book a follow-up next week")
    steps = list(engine.run_turn(ev, provider=provider, store=store, ehr=ehr))
    dicts = show("scheduling turn (nothing booked yet)", steps)
    print(f"appointments so far: {len(ehr._appointments)}")

    pending = next(d for d in dicts if d["type"] == "pending")
    sid = list(store.sessions)[0]
    confirm_steps = list(engine.confirm(sid, pending["action_id"], store=store, ehr=ehr))
    show("confirm -> write committed", confirm_steps)
    print(f"appointments now: {len(ehr._appointments)}")

    # 2) Urgent triage: escalate, book nothing
    ev2 = ConversationEvent("c1", "app", "ptok_2", "I have chest pain and shortness of breath")
    steps2 = list(engine.run_turn(ev2, provider=provider, store=store, ehr=ehr))
    show("urgent triage", steps2)

    # 3) Redaction visible in what gets stored
    ev3 = ConversationEvent("c1", "app", "ptok_3",
                            "My name is Jane Doe, reach me at 512-555-0199")
    list(engine.run_turn(ev3, provider=provider, store=store, ehr=ehr))
    stored = [m["text_redacted"] for m in store.messages if m["role"] == "patient"][-1]
    print(f"\nstored (redacted) inbound: {stored!r}")


if __name__ == "__main__":
    main()
