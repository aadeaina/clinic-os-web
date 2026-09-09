"""End-to-end backend tests — exercises the full HTTP contract against Django's test DB.

Each test class covers one complete operational scenario using the real Django ORM and
MockProvider / MockEHRAdapter, verifying the contract the mobile and web clients depend on.

Scenarios:
  TestSchedulingE2E     — full booking round-trip: POST event → stream → POST confirm
  TestTriageEscalationE2E — urgent symptoms → escalate, nothing booked
  TestPHIRedactionE2E   — raw PHI never stored or returned by any endpoint
  TestMultiTurnE2E      — same session_id accumulates turns correctly
  TestAllIntentsE2E     — each routing intent produces the expected session outcome
  TestAnalyticsE2E      — session outcomes update analytics metrics correctly

Run from the backend/ directory:
    python3 manage.py test tests.test_e2e -v 2
"""
import json

from rest_framework import status
from rest_framework.test import APITestCase

from .base import AuthenticatedAPITestCase

from core.models import Message, PendingAction, Session, Step


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _post(client, text, patient_ref="ptok_e2e", session_id=None, channel="app"):
    body = {"clinic_id": "", "channel": channel,
            "patient_ref": patient_ref, "text": text}
    if session_id:
        body["session_id"] = session_id
    return client.post("/api/events", body, format="json")


def _stream_steps(client, session_id):
    resp = client.get(f"/api/sessions/{session_id}/stream")
    raw = b"".join(resp.streaming_content).decode()
    steps = []
    for line in raw.splitlines():
        if line.startswith("data:") and line.strip() != "data: {}":
            steps.append(json.loads(line[5:].strip()))
    return steps


def _step_types(client, session_id):
    return [s["type"] for s in _stream_steps(client, session_id)]


# ---------------------------------------------------------------------------
# Scheduling E2E: POST event → stream → POST confirm
# ---------------------------------------------------------------------------

class TestSchedulingE2E(AuthenticatedAPITestCase):
    """Full two-phase scheduling round-trip through the HTTP API."""

    def setUp(self):
        super().setUp()
        resp = _post(self.client, "I need to book a follow-up next week",
                     patient_ref="ptok_sched")
        self.assertEqual(resp.status_code, 200)
        self.session_id = resp.data["session_id"]

    def test_stream_routing_intent_is_scheduling(self):
        steps = _stream_steps(self.client, self.session_id)
        routing = next(s for s in steps if s["type"] == "routing")
        self.assertEqual(routing["decision"]["intent"], "scheduling")

    def test_stream_contains_tool_use_step(self):
        self.assertIn("tool_use", _step_types(self.client, self.session_id))

    def test_stream_contains_pending_step(self):
        self.assertIn("pending", _step_types(self.client, self.session_id))

    def test_stream_ends_with_final(self):
        steps = _stream_steps(self.client, self.session_id)
        self.assertEqual(steps[-1]["type"], "final")

    def test_pending_action_created_in_db(self):
        count = PendingAction.objects.filter(session_id=self.session_id).count()
        self.assertGreater(count, 0)

    def test_pending_action_state_is_pending_before_confirm(self):
        p = PendingAction.objects.filter(session_id=self.session_id).first()
        if p is None:
            self.skipTest("No pending action found")
        self.assertEqual(p.state, "pending")

    def test_confirm_transitions_action_to_committed(self):
        p = PendingAction.objects.filter(
            session_id=self.session_id, state="pending").first()
        if p is None:
            self.skipTest("No pending action found")
        self.client.post(f"/api/sessions/{self.session_id}/confirm",
                         {"action_id": str(p.id)}, format="json")
        p.refresh_from_db()
        self.assertEqual(p.state, "committed")

    def test_confirm_response_has_final_step(self):
        p = PendingAction.objects.filter(
            session_id=self.session_id, state="pending").first()
        if p is None:
            self.skipTest("No pending action found")
        resp = self.client.post(f"/api/sessions/{self.session_id}/confirm",
                                {"action_id": str(p.id)}, format="json")
        types = [s["type"] for s in resp.data["steps"]]
        self.assertIn("final", types)

    def test_session_status_is_resolved_after_confirm(self):
        p = PendingAction.objects.filter(
            session_id=self.session_id, state="pending").first()
        if p is None:
            self.skipTest("No pending action found")
        self.client.post(f"/api/sessions/{self.session_id}/confirm",
                         {"action_id": str(p.id)}, format="json")
        session = Session.objects.get(id=self.session_id)
        self.assertEqual(session.status, "resolved")

    def test_stream_confirms_step_replayed_after_confirm(self):
        p = PendingAction.objects.filter(
            session_id=self.session_id, state="pending").first()
        if p is None:
            self.skipTest("No pending action found")
        self.client.post(f"/api/sessions/{self.session_id}/confirm",
                         {"action_id": str(p.id)}, format="json")
        steps = _stream_steps(self.client, self.session_id)
        # Stream now includes both turn and confirm steps
        types = [s["type"] for s in steps]
        self.assertIn("tool_result", types)

    def test_double_confirm_returns_escalate(self):
        p = PendingAction.objects.filter(
            session_id=self.session_id, state="pending").first()
        if p is None:
            self.skipTest("No pending action found")
        action_id = str(p.id)
        self.client.post(f"/api/sessions/{self.session_id}/confirm",
                         {"action_id": action_id}, format="json")
        resp2 = self.client.post(f"/api/sessions/{self.session_id}/confirm",
                                 {"action_id": action_id}, format="json")
        types = [s["type"] for s in resp2.data["steps"]]
        self.assertIn("escalate", types)


# ---------------------------------------------------------------------------
# Triage escalation E2E
# ---------------------------------------------------------------------------

class TestTriageEscalationE2E(AuthenticatedAPITestCase):
    """Urgent symptoms must escalate immediately — nothing booked, never contained."""

    def setUp(self):
        super().setUp()
        resp = _post(self.client, "I have chest pain and shortness of breath",
                     patient_ref="ptok_triage")
        self.session_id = resp.data["session_id"]

    def test_session_status_is_escalated(self):
        self.assertEqual(Session.objects.get(id=self.session_id).status, "escalated")

    def test_session_is_not_contained(self):
        self.assertFalse(Session.objects.get(id=self.session_id).contained)

    def test_stream_contains_escalate_step(self):
        self.assertIn("escalate", _step_types(self.client, self.session_id))

    def test_escalate_reason_is_urgent_symptom(self):
        steps = _stream_steps(self.client, self.session_id)
        esc = next(s for s in steps if s["type"] == "escalate")
        self.assertEqual(esc["reason"], "urgent_symptom")

    def test_no_tool_use_steps_before_escalation(self):
        self.assertNotIn("tool_use", _step_types(self.client, self.session_id))

    def test_no_pending_actions_created(self):
        count = PendingAction.objects.filter(session_id=self.session_id).count()
        self.assertEqual(count, 0)

    def test_session_detail_shows_not_contained(self):
        resp = self.client.get(f"/api/sessions/{self.session_id}")
        self.assertFalse(resp.data["contained"])

    def test_analytics_escalation_rate_is_positive(self):
        data = self.client.get("/api/analytics/summary").data
        self.assertGreater(data["escalation_rate"], 0.0)


# ---------------------------------------------------------------------------
# PHI redaction E2E
# ---------------------------------------------------------------------------

class TestPHIRedactionE2E(AuthenticatedAPITestCase):
    """Raw PHI must never appear in the database or in any API response."""

    RAW_NAME = "Jane Doe"
    RAW_PHONE = "512-555-0199"
    RAW_EMAIL = "jane@example.com"
    RAW_TEXT = f"My name is {RAW_NAME}, call me at {RAW_PHONE} or {RAW_EMAIL}"

    def setUp(self):
        super().setUp()
        resp = _post(self.client, self.RAW_TEXT, patient_ref="ptok_phi")
        self.session_id = resp.data["session_id"]

    def _assert_no_phi(self, text, label=""):
        prefix = f"[{label}] " if label else ""
        self.assertNotIn(self.RAW_NAME, text, msg=f"{prefix}raw name leaked")
        self.assertNotIn(self.RAW_PHONE, text, msg=f"{prefix}raw phone leaked")
        self.assertNotIn(self.RAW_EMAIL, text, msg=f"{prefix}raw email leaked")

    # DB-level checks
    def test_messages_table_has_no_raw_phi(self):
        for msg in Message.objects.filter(session_id=self.session_id):
            self._assert_no_phi(msg.text_redacted, label="Message")

    def test_step_payloads_have_no_raw_phi(self):
        for step in Step.objects.filter(session_id=self.session_id):
            self._assert_no_phi(json.dumps(step.payload), label=f"Step({step.type})")

    def test_messages_contain_placeholder_tokens(self):
        texts = " ".join(
            m.text_redacted for m in Message.objects.filter(session_id=self.session_id))
        self.assertIn("[NAME_1]", texts)

    # API-level checks
    def test_session_detail_response_has_no_raw_phi(self):
        resp_str = json.dumps(self.client.get(f"/api/sessions/{self.session_id}").data)
        self._assert_no_phi(resp_str, label="session_detail")

    def test_sessions_list_response_has_no_raw_phi(self):
        resp_str = json.dumps(self.client.get("/api/sessions").data)
        self._assert_no_phi(resp_str, label="sessions_list")

    def test_stream_response_has_no_raw_phi(self):
        resp = self.client.get(f"/api/sessions/{self.session_id}/stream")
        content = b"".join(resp.streaming_content).decode()
        self._assert_no_phi(content, label="stream")


# ---------------------------------------------------------------------------
# Multi-turn session E2E
# ---------------------------------------------------------------------------

class TestMultiTurnE2E(AuthenticatedAPITestCase):
    """Posting subsequent events to the same session_id extends the same session."""

    def setUp(self):
        super().setUp()
        self.patient = "ptok_multi"
        resp = _post(self.client, "Book an appointment please", patient_ref=self.patient)
        self.session_id = resp.data["session_id"]
        self.steps_after_first = Step.objects.filter(session_id=self.session_id).count()

    def test_second_event_reuses_same_session(self):
        resp = _post(self.client, "What is my balance?",
                     patient_ref=self.patient, session_id=self.session_id)
        self.assertEqual(resp.data["session_id"], self.session_id)

    def test_second_event_adds_more_steps(self):
        _post(self.client, "What is my balance?",
              patient_ref=self.patient, session_id=self.session_id)
        steps_after_second = Step.objects.filter(session_id=self.session_id).count()
        self.assertGreater(steps_after_second, self.steps_after_first)

    def test_only_one_session_exists_for_patient(self):
        _post(self.client, "What is my balance?",
              patient_ref=self.patient, session_id=self.session_id)
        self.assertEqual(Session.objects.filter(id=self.session_id).count(), 1)

    def test_second_turn_messages_are_appended(self):
        msgs_before = Message.objects.filter(session_id=self.session_id).count()
        _post(self.client, "What is my balance?",
              patient_ref=self.patient, session_id=self.session_id)
        msgs_after = Message.objects.filter(session_id=self.session_id).count()
        self.assertGreater(msgs_after, msgs_before)

    def test_stream_replays_all_turns(self):
        _post(self.client, "What is my balance?",
              patient_ref=self.patient, session_id=self.session_id)
        steps = _stream_steps(self.client, self.session_id)
        routing_steps = [s for s in steps if s["type"] == "routing"]
        self.assertGreaterEqual(len(routing_steps), 2)


# ---------------------------------------------------------------------------
# Intent routing E2E — one smoke test per specialist intent
# ---------------------------------------------------------------------------

class TestAllIntentsE2E(AuthenticatedAPITestCase):
    """Each intent routes to the expected agent and produces a contained or escalated session."""

    def _check(self, text, expected_intent, expect_contained=True):
        resp = _post(self.client, text)
        sid = resp.data["session_id"]
        steps = _stream_steps(self.client, sid)
        routing = next(s for s in steps if s["type"] == "routing")
        self.assertEqual(routing["decision"]["intent"], expected_intent,
                         msg=f"Intent mismatch for: {text!r}")
        session = Session.objects.get(id=sid)
        if expect_contained:
            self.assertIn(session.status, ("resolved", "active"),
                          msg=f"Expected resolved for {text!r}")
        else:
            self.assertEqual(session.status, "escalated")

    def test_scheduling_intent(self):
        self._check("I need to book a follow-up next week", "scheduling")

    def test_billing_intent(self):
        self._check("what is my balance and copay", "billing")

    def test_intake_intent(self):
        self._check("I'm a new patient and need to register", "intake")

    def test_triage_urgent_escalates(self):
        self._check("I have chest pain and shortness of breath", "triage",
                    expect_contained=False)

    def test_triage_non_urgent_is_contained(self):
        self._check("I have a mild cough and sore throat", "triage", expect_contained=True)


# ---------------------------------------------------------------------------
# Analytics E2E
# ---------------------------------------------------------------------------

class TestAnalyticsE2E(AuthenticatedAPITestCase):
    """Analytics metrics reflect session outcomes correctly after real sessions."""

    def test_empty_db_returns_zero_metrics(self):
        data = self.client.get("/api/analytics/summary").data
        self.assertEqual(data["total_sessions"], 0)
        self.assertEqual(data["containment_rate"], 0)
        self.assertEqual(data["escalation_rate"], 0)

    def test_total_sessions_counts_correctly(self):
        _post(self.client, "Book an appointment please")
        _post(self.client, "what is my balance")
        data = self.client.get("/api/analytics/summary").data
        self.assertEqual(data["total_sessions"], 2)

    def test_containment_rate_correct_after_contained_session(self):
        _post(self.client, "what is my balance and copay")
        data = self.client.get("/api/analytics/summary").data
        self.assertGreater(data["containment_rate"], 0.0)

    def test_escalation_rate_correct_after_escalated_session(self):
        _post(self.client, "I have chest pain and shortness of breath")
        data = self.client.get("/api/analytics/summary").data
        self.assertEqual(data["escalation_rate"], 1.0)

    def test_by_intent_populated_after_sessions(self):
        _post(self.client, "what is my balance")
        _post(self.client, "I need to book a follow-up next week")
        data = self.client.get("/api/analytics/summary").data
        self.assertIn("billing", data["by_intent"])
        self.assertIn("scheduling", data["by_intent"])

    def test_mixed_sessions_rates_are_fractions(self):
        _post(self.client, "what is my balance")   # contained
        _post(self.client, "I have chest pain and shortness of breath")  # escalated
        data = self.client.get("/api/analytics/summary").data
        self.assertEqual(data["total_sessions"], 2)
        self.assertEqual(data["escalation_rate"], 0.5)
