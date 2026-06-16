"""Unit tests for orchestration.schemas — pure stdlib, no Django, no network.

Run from the backend/ directory:
    python3 -m unittest tests.test_schemas -v
"""
import unittest

from orchestration.schemas import (
    ConversationEvent, RoutingDecision,
    ev_routing, ev_agent_msg, ev_tool_use, ev_tool_result,
    ev_pending, ev_escalate, ev_final,
    CHANNELS, INTENTS,
)


def _make_event(**kwargs):
    defaults = dict(clinic_id="c1", channel="app", patient_ref="ptok_1", text="hello")
    defaults.update(kwargs)
    return ConversationEvent(**defaults)


class TestConversationEventValidate(unittest.TestCase):
    def test_valid_event_passes(self):
        _make_event().validate()

    def test_all_valid_channels_pass(self):
        for ch in CHANNELS:
            _make_event(channel=ch).validate()

    def test_unknown_channel_raises(self):
        with self.assertRaises(ValueError) as cm:
            _make_event(channel="fax").validate()
        self.assertIn("fax", str(cm.exception))

    def test_empty_channel_raises(self):
        with self.assertRaises(ValueError):
            _make_event(channel="").validate()

    def test_empty_text_raises(self):
        with self.assertRaises(ValueError):
            _make_event(text="").validate()

    def test_whitespace_only_text_raises(self):
        with self.assertRaises(ValueError):
            _make_event(text="   ").validate()

    def test_none_session_id_is_allowed(self):
        _make_event(session_id=None).validate()

    def test_explicit_session_id_is_preserved(self):
        e = _make_event(session_id="my-session-42")
        self.assertEqual(e.session_id, "my-session-42")


class TestRoutingDecisionToDict(unittest.TestCase):
    def _decision(self, **kwargs):
        defaults = dict(intent="scheduling", agent="scheduling",
                        confidence=0.9, urgent=False, rationale="test")
        defaults.update(kwargs)
        return RoutingDecision(**defaults)

    def test_to_dict_has_all_fields(self):
        d = self._decision().to_dict()
        for key in ("intent", "agent", "confidence", "urgent", "rationale"):
            self.assertIn(key, d)

    def test_urgent_flag_preserved(self):
        d = self._decision(urgent=True).to_dict()
        self.assertTrue(d["urgent"])

    def test_none_agent_preserved(self):
        d = self._decision(agent=None).to_dict()
        self.assertIsNone(d["agent"])


class TestStepEventConstructors(unittest.TestCase):
    def _decision(self):
        return RoutingDecision(intent="scheduling", agent="scheduling",
                               confidence=0.9, urgent=False, rationale="test")

    def test_ev_routing_type_and_decision(self):
        d = ev_routing(self._decision()).to_dict()
        self.assertEqual(d["type"], "routing")
        self.assertIn("decision", d)
        self.assertEqual(d["decision"]["intent"], "scheduling")

    def test_ev_routing_urgent_decision(self):
        decision = RoutingDecision(intent="triage", agent="triage",
                                   confidence=0.95, urgent=True, rationale="symptoms")
        d = ev_routing(decision).to_dict()
        self.assertTrue(d["decision"]["urgent"])

    def test_ev_agent_msg(self):
        d = ev_agent_msg("scheduling", "Here are your available slots.").to_dict()
        self.assertEqual(d["type"], "agent_msg")
        self.assertEqual(d["agent"], "scheduling")
        self.assertEqual(d["text"], "Here are your available slots.")

    def test_ev_tool_use(self):
        d = ev_tool_use("check_availability", {"date_range": "next_7_days"}).to_dict()
        self.assertEqual(d["type"], "tool_use")
        self.assertEqual(d["tool"], "check_availability")
        self.assertEqual(d["input"]["date_range"], "next_7_days")

    def test_ev_tool_result(self):
        d = ev_tool_result("check_availability", {"slots": []}).to_dict()
        self.assertEqual(d["type"], "tool_result")
        self.assertEqual(d["tool"], "check_availability")
        self.assertEqual(d["output"], {"slots": []})

    def test_ev_pending(self):
        d = ev_pending("book_appointment", "aid-abc", "Book Tuesday 2:30 PM").to_dict()
        self.assertEqual(d["type"], "pending")
        self.assertEqual(d["action"], "book_appointment")
        self.assertEqual(d["action_id"], "aid-abc")
        self.assertEqual(d["summary"], "Book Tuesday 2:30 PM")

    def test_ev_escalate(self):
        d = ev_escalate("urgent_symptom").to_dict()
        self.assertEqual(d["type"], "escalate")
        self.assertEqual(d["reason"], "urgent_symptom")

    def test_ev_final_contained(self):
        d = ev_final("All done!", contained=True).to_dict()
        self.assertEqual(d["type"], "final")
        self.assertEqual(d["text"], "All done!")
        self.assertTrue(d["contained"])

    def test_ev_final_not_contained(self):
        d = ev_final("Escalated.", contained=False).to_dict()
        self.assertFalse(d["contained"])

    def test_step_event_to_dict_merges_type_and_data(self):
        e = ev_escalate("max_iterations")
        d = e.to_dict()
        self.assertIn("type", d)
        self.assertIn("reason", d)
        self.assertNotIn("data", d)


if __name__ == "__main__":
    unittest.main()
