"""Django REST Framework tests for every API endpoint.

Each test class is isolated: Django wraps each test in a transaction that is
rolled back afterwards, so the database is clean for every test method.

Run from the backend/ directory:
    python3 manage.py test tests.test_api -v 2
"""
import json

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .base import AuthenticatedAPITestCase

from core.models import PendingAction, Session, Step


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _post_event(client, text="Book an appointment please", channel="app",
                patient_ref="ptok_test", clinic_id="", session_id=None):
    body = {"clinic_id": clinic_id, "channel": channel,
            "patient_ref": patient_ref, "text": text}
    if session_id:
        body["session_id"] = session_id
    return client.post("/api/events", body, format="json")


# ---------------------------------------------------------------------------
# Authentication / authorization
# ---------------------------------------------------------------------------

class TestAuthentication(APITestCase):
    """These deliberately use plain APITestCase (no bridge token attached by default)."""

    def test_events_without_token_returns_401(self):
        resp = _post_event(self.client)
        self.assertEqual(resp.status_code, 401)

    def test_sessions_without_token_returns_401(self):
        self.assertEqual(self.client.get("/api/sessions").status_code, 401)

    def test_garbage_token_returns_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-real-token")
        self.assertEqual(self.client.get("/api/sessions").status_code, 401)

    def test_patient_role_cannot_list_sessions(self):
        from .auth_test_utils import auth_header
        self.client.credentials(HTTP_AUTHORIZATION=auth_header(role="patient"))
        self.assertEqual(self.client.get("/api/sessions").status_code, 403)

    def test_patient_role_can_post_events(self):
        from .auth_test_utils import auth_header
        self.client.credentials(HTTP_AUTHORIZATION=auth_header(role="patient"))
        resp = _post_event(self.client)
        self.assertEqual(resp.status_code, 200)


# ---------------------------------------------------------------------------
# POST /api/events
# ---------------------------------------------------------------------------

class TestEventsEndpoint(AuthenticatedAPITestCase):
    def test_valid_event_returns_200(self):
        resp = _post_event(self.client)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_valid_event_returns_session_id(self):
        resp = _post_event(self.client)
        self.assertIn("session_id", resp.data)
        self.assertIsNotNone(resp.data["session_id"])

    def test_session_is_created_in_db(self):
        resp = _post_event(self.client)
        session_id = resp.data["session_id"]
        self.assertTrue(Session.objects.filter(id=session_id).exists())

    def test_steps_are_persisted_after_event(self):
        resp = _post_event(self.client)
        count = Step.objects.filter(session_id=resp.data["session_id"]).count()
        self.assertGreater(count, 0)

    def test_empty_text_returns_400(self):
        resp = _post_event(self.client, text="")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_whitespace_text_returns_400(self):
        resp = _post_event(self.client, text="   ")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_channel_returns_400(self):
        resp = _post_event(self.client, channel="fax")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_second_event_with_same_session_id_reuses_session(self):
        sid = _post_event(self.client).data["session_id"]
        resp2 = _post_event(self.client, text="what is my balance", session_id=sid)
        self.assertEqual(resp2.data["session_id"], sid)
        self.assertEqual(Session.objects.filter(id=sid).count(), 1)

    def test_step_first_type_is_routing(self):
        sid = _post_event(self.client).data["session_id"]
        first_step = Step.objects.filter(session_id=sid).order_by("idx").first()
        self.assertEqual(first_step.type, "routing")


# ---------------------------------------------------------------------------
# GET /api/sessions
# ---------------------------------------------------------------------------

class TestSessionsListEndpoint(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        resp = _post_event(self.client)
        self.session_id = resp.data["session_id"]

    def test_returns_200(self):
        self.assertEqual(self.client.get("/api/sessions").status_code, 200)

    def test_returns_list(self):
        self.assertIsInstance(self.client.get("/api/sessions").data, list)

    def test_created_session_appears_in_list(self):
        ids = [s["id"] for s in self.client.get("/api/sessions").data]
        self.assertIn(self.session_id, ids)

    def test_session_list_item_has_required_fields(self):
        sessions = self.client.get("/api/sessions").data
        item = next(s for s in sessions if s["id"] == self.session_id)
        for field in ("id", "channel", "status", "contained", "intent", "created"):
            self.assertIn(field, item, msg=f"Missing field: {field}")

    def test_intent_is_populated(self):
        sessions = self.client.get("/api/sessions").data
        item = next(s for s in sessions if s["id"] == self.session_id)
        self.assertIsNotNone(item["intent"])


# ---------------------------------------------------------------------------
# GET /api/sessions/{id}
# ---------------------------------------------------------------------------

class TestSessionDetailEndpoint(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        resp = _post_event(self.client)
        self.session_id = resp.data["session_id"]

    def test_returns_200(self):
        self.assertEqual(
            self.client.get(f"/api/sessions/{self.session_id}").status_code, 200)

    def test_returns_correct_session_id(self):
        data = self.client.get(f"/api/sessions/{self.session_id}").data
        self.assertEqual(data["id"], self.session_id)

    def test_has_all_required_fields(self):
        data = self.client.get(f"/api/sessions/{self.session_id}").data
        for field in ("id", "channel", "status", "contained",
                      "messages", "tool_calls", "pending", "steps"):
            self.assertIn(field, data, msg=f"Missing field: {field}")

    def test_messages_is_list(self):
        data = self.client.get(f"/api/sessions/{self.session_id}").data
        self.assertIsInstance(data["messages"], list)

    def test_steps_is_list(self):
        data = self.client.get(f"/api/sessions/{self.session_id}").data
        self.assertIsInstance(data["steps"], list)
        self.assertGreater(len(data["steps"]), 0)

    def test_messages_do_not_contain_raw_phi(self):
        resp = _post_event(self.client, text="My name is Jane Doe, call 512-555-0199",
                           patient_ref="ptok_phi")
        sid = resp.data["session_id"]
        data = self.client.get(f"/api/sessions/{sid}").data
        all_text = " ".join(m["text"] for m in data["messages"])
        self.assertNotIn("Jane Doe", all_text)
        self.assertNotIn("512-555-0199", all_text)

    def test_unknown_session_returns_404(self):
        resp = self.client.get("/api/sessions/00000000-0000-0000-0000-000000000000")
        self.assertEqual(resp.status_code, 404)


# ---------------------------------------------------------------------------
# GET /api/sessions/{id}/stream
# ---------------------------------------------------------------------------

class TestStreamEndpoint(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        resp = _post_event(self.client)
        self.session_id = resp.data["session_id"]

    def _stream_steps(self, session_id=None):
        sid = session_id or self.session_id
        resp = self.client.get(f"/api/sessions/{sid}/stream")
        raw = b"".join(resp.streaming_content).decode()
        steps = []
        for line in raw.splitlines():
            if line.startswith("data:") and line.strip() != "data: {}":
                steps.append(json.loads(line[5:].strip()))
        return resp, steps

    def test_returns_200(self):
        resp, _ = self._stream_steps()
        self.assertEqual(resp.status_code, 200)

    def test_content_type_is_event_stream(self):
        resp, _ = self._stream_steps()
        self.assertEqual(resp["Content-Type"], "text/event-stream")

    def test_cache_control_is_no_cache(self):
        resp, _ = self._stream_steps()
        self.assertEqual(resp.get("Cache-Control"), "no-cache")

    def test_events_are_valid_json(self):
        _, steps = self._stream_steps()
        self.assertGreater(len(steps), 0)
        for step in steps:
            self.assertIn("type", step)

    def test_first_event_is_routing(self):
        _, steps = self._stream_steps()
        self.assertEqual(steps[0]["type"], "routing")

    def test_last_event_is_final_or_escalate(self):
        _, steps = self._stream_steps()
        self.assertIn(steps[-1]["type"], ("final", "escalate"))

    def test_unknown_session_returns_404(self):
        resp = self.client.get("/api/sessions/00000000-0000-0000-0000-000000000000/stream")
        self.assertEqual(resp.status_code, 404)


# ---------------------------------------------------------------------------
# POST /api/sessions/{id}/confirm
# ---------------------------------------------------------------------------

class TestConfirmEndpoint(AuthenticatedAPITestCase):
    def setUp(self):
        super().setUp()
        resp = _post_event(self.client, text="I need to book a follow-up next week")
        self.session_id = resp.data["session_id"]
        self.pending = PendingAction.objects.filter(
            session_id=self.session_id, state="pending").first()

    def test_confirm_returns_200(self):
        if self.pending is None:
            self.skipTest("No pending action produced by mock provider")
        resp = self.client.post(
            f"/api/sessions/{self.session_id}/confirm",
            {"action_id": str(self.pending.id)}, format="json",
        )
        self.assertEqual(resp.status_code, 200)

    def test_confirm_response_has_steps(self):
        if self.pending is None:
            self.skipTest("No pending action")
        resp = self.client.post(
            f"/api/sessions/{self.session_id}/confirm",
            {"action_id": str(self.pending.id)}, format="json",
        )
        self.assertIn("steps", resp.data)
        self.assertIsInstance(resp.data["steps"], list)

    def test_confirm_response_ends_with_final(self):
        if self.pending is None:
            self.skipTest("No pending action")
        resp = self.client.post(
            f"/api/sessions/{self.session_id}/confirm",
            {"action_id": str(self.pending.id)}, format="json",
        )
        types = [s["type"] for s in resp.data["steps"]]
        self.assertIn("final", types)

    def test_confirmed_action_state_is_committed(self):
        if self.pending is None:
            self.skipTest("No pending action")
        self.client.post(
            f"/api/sessions/{self.session_id}/confirm",
            {"action_id": str(self.pending.id)}, format="json",
        )
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.state, "committed")

    def test_double_confirm_returns_escalate(self):
        if self.pending is None:
            self.skipTest("No pending action")
        action_id = str(self.pending.id)
        self.client.post(
            f"/api/sessions/{self.session_id}/confirm",
            {"action_id": action_id}, format="json",
        )
        resp = self.client.post(
            f"/api/sessions/{self.session_id}/confirm",
            {"action_id": action_id}, format="json",
        )
        types = [s["type"] for s in resp.data["steps"]]
        self.assertIn("escalate", types)

    def test_confirm_steps_persisted_to_db(self):
        if self.pending is None:
            self.skipTest("No pending action")
        before = Step.objects.filter(session_id=self.session_id).count()
        self.client.post(
            f"/api/sessions/{self.session_id}/confirm",
            {"action_id": str(self.pending.id)}, format="json",
        )
        after = Step.objects.filter(session_id=self.session_id).count()
        self.assertGreater(after, before)

    def test_confirm_rejects_action_from_another_session(self):
        """A pending action belonging to session A must not be committable via session B's
        confirm endpoint, even by an authenticated caller who merely knows the action id."""
        if self.pending is None:
            self.skipTest("No pending action")
        other = _post_event(self.client, text="what is my balance",
                             patient_ref="ptok_other")
        other_session_id = other.data["session_id"]

        resp = self.client.post(
            f"/api/sessions/{other_session_id}/confirm",
            {"action_id": str(self.pending.id)}, format="json",
        )
        types = [s["type"] for s in resp.data["steps"]]
        self.assertIn("escalate", types)
        self.pending.refresh_from_db()
        self.assertEqual(self.pending.state, "pending")


# ---------------------------------------------------------------------------
# GET /api/analytics/summary
# ---------------------------------------------------------------------------

class TestAnalyticsEndpoint(AuthenticatedAPITestCase):
    def test_returns_200(self):
        self.assertEqual(self.client.get("/api/analytics/summary").status_code, 200)

    def test_has_required_fields(self):
        data = self.client.get("/api/analytics/summary").data
        for field in ("total_sessions", "containment_rate", "escalation_rate", "by_intent"):
            self.assertIn(field, data)

    def test_rates_are_zero_when_no_sessions(self):
        data = self.client.get("/api/analytics/summary").data
        self.assertEqual(data["total_sessions"], 0)
        self.assertEqual(data["containment_rate"], 0)
        self.assertEqual(data["escalation_rate"], 0)

    def test_total_increments_after_event(self):
        _post_event(self.client)
        data = self.client.get("/api/analytics/summary").data
        self.assertEqual(data["total_sessions"], 1)

    def test_by_intent_is_dict(self):
        _post_event(self.client)
        self.assertIsInstance(
            self.client.get("/api/analytics/summary").data["by_intent"], dict)

    def test_rates_are_between_0_and_1(self):
        _post_event(self.client)
        data = self.client.get("/api/analytics/summary").data
        self.assertGreaterEqual(data["containment_rate"], 0.0)
        self.assertLessEqual(data["containment_rate"], 1.0)
        self.assertGreaterEqual(data["escalation_rate"], 0.0)
        self.assertLessEqual(data["escalation_rate"], 1.0)

    def test_escalated_session_raises_escalation_rate(self):
        _post_event(self.client, text="I have chest pain and shortness of breath")
        data = self.client.get("/api/analytics/summary").data
        self.assertGreater(data["escalation_rate"], 0.0)
