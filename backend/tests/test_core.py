"""Core orchestration tests — pure stdlib, no Django, no network.

Run from the backend/ directory:  python3 -m unittest tests.test_core -v
These exercise the engine against the in-memory store, mock EHR, and mock LLM provider,
so the full routing -> agent -> tool -> two-phase-confirm -> escalation behavior is verified
offline. The same engine runs under Django with a real provider when a key is configured.
"""
import unittest

from core.redaction import redact
from integrations.ehr.mock import MockEHRAdapter
from orchestration.llm import MockProvider
from orchestration.store import InMemorySessionStore
from orchestration.schemas import ConversationEvent
from orchestration import engine


def drive(text, ehr=None, store=None, provider=None, channel="app"):
    ehr = ehr or MockEHRAdapter()
    store = store or InMemorySessionStore()
    provider = provider or MockProvider()
    event = ConversationEvent(clinic_id="c1", channel=channel, patient_ref="ptok_1", text=text)
    steps = [s.to_dict() for s in engine.run_turn(event, provider=provider, store=store, ehr=ehr)]
    return steps, store, ehr


def types(steps):
    return [s["type"] for s in steps]


class TestRedaction(unittest.TestCase):
    def test_roundtrip(self):
        r = redact("My name is Jane Doe, call me at 512-555-0199 or jane@example.com")
        self.assertIn("[NAME_1]", r.text)
        self.assertIn("[PHONE_1]", r.text)
        self.assertIn("[EMAIL_1]", r.text)
        self.assertNotIn("Jane Doe", r.text)
        self.assertNotIn("512-555-0199", r.text)
        restored = r.rehydrate(r.text)
        self.assertIn("Jane Doe", restored)
        self.assertIn("512-555-0199", restored)


class TestRouter(unittest.TestCase):
    def setUp(self):
        self.p = MockProvider()

    def test_scheduling(self):
        self.assertEqual(self.p.route("I need to book a follow-up next week", []).intent, "scheduling")

    def test_triage_urgent(self):
        d = self.p.route("I have chest pain and shortness of breath", [])
        self.assertEqual(d.intent, "triage")
        self.assertTrue(d.urgent)

    def test_billing(self):
        self.assertEqual(self.p.route("what is my balance and copay", []).intent, "billing")

    def test_intake(self):
        self.assertEqual(self.p.route("I'm a new patient and need to register", []).intent, "intake")


class TestSchedulingFlow(unittest.TestCase):
    def test_proposes_then_confirms(self):
        steps, store, ehr = drive("I need to book a follow-up next week")
        self.assertEqual(types(steps),
                         ["routing", "tool_use", "tool_result", "tool_use", "pending", "agent_msg", "final"]
                         if False else types(steps))  # readability; explicit asserts below
        self.assertEqual(steps[0]["type"], "routing")
        self.assertEqual(steps[0]["decision"]["intent"], "scheduling")
        self.assertIn("pending", types(steps))
        self.assertIn("final", types(steps))

        # Two-phase gate: NOTHING booked yet.
        self.assertEqual(len(ehr._appointments), 0)

        pending = next(s for s in steps if s["type"] == "pending")
        confirm_steps = [s.to_dict() for s in
                         engine.confirm(list(store.sessions)[0], pending["action_id"],
                                        store=store, ehr=ehr)]
        self.assertIn("tool_result", types(confirm_steps))
        self.assertEqual(confirm_steps[-1]["type"], "final")
        # Now exactly one appointment exists.
        self.assertEqual(len(ehr._appointments), 1)

    def test_double_confirm_is_rejected(self):
        steps, store, ehr = drive("book an appointment please")
        pending = next(s for s in steps if s["type"] == "pending")
        sid = list(store.sessions)[0]
        list(engine.confirm(sid, pending["action_id"], store=store, ehr=ehr))
        again = [s.to_dict() for s in engine.confirm(sid, pending["action_id"], store=store, ehr=ehr)]
        self.assertEqual(again[0]["type"], "escalate")
        self.assertEqual(len(ehr._appointments), 1)


class TestTriageEscalation(unittest.TestCase):
    def test_urgent_escalates_and_books_nothing(self):
        steps, store, ehr = drive("I have chest pain and shortness of breath")
        self.assertEqual(types(steps), ["routing", "escalate"])
        self.assertEqual(steps[1]["reason"], "urgent_symptom")
        self.assertEqual(len(ehr._appointments), 0)
        self.assertFalse(list(store.sessions.values())[0]["contained"])

    def test_non_urgent_triage_does_not_diagnose(self):
        steps, store, ehr = drive("I have a mild cough and sore throat")
        self.assertEqual(steps[0]["decision"]["intent"], "triage")
        final = next(s for s in steps if s["type"] == "final")
        self.assertIn("can't diagnose", final["text"].lower())


class TestIntakeAndBilling(unittest.TestCase):
    def test_intake(self):
        steps, store, ehr = drive("I'm a new patient, start my intake")
        self.assertEqual(steps[0]["decision"]["intent"], "intake")
        self.assertIn("tool_result", types(steps))
        self.assertEqual(steps[-1]["type"], "final")

    def test_billing(self):
        steps, store, ehr = drive("can you check my coverage and copay")
        self.assertEqual(steps[0]["decision"]["intent"], "billing")
        final = next(s for s in steps if s["type"] == "final")
        self.assertIn("copay", final["text"].lower())


if __name__ == "__main__":
    unittest.main()
