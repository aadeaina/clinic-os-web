"""Unit tests for orchestration tools — pure stdlib, no Django, no network.

Each tool is exercised against MockEHRAdapter and a simple ToolContext.

Run from the backend/ directory:
    python3 -m unittest tests.test_tools -v
"""
import unittest

from integrations.ehr.mock import MockEHRAdapter
from orchestration.tools.base import ToolContext
from orchestration.tools.billing_tools import GetBalance, LookupCoverage, BILLING_TOOLS
from orchestration.tools.intake_tools import SaveIntakeField, StartIntake, INTAKE_TOOLS
from orchestration.tools.registry import tool_by_name
from orchestration.tools.scheduling_tools import (
    BookAppointment, CheckAvailability, SCHEDULING_TOOLS,
)
from orchestration.tools.triage_tools import AssessUrgency, RouteToNurse, TRIAGE_TOOLS


def _ctx(patient_ref="ptok_1", clinic_id="c1"):
    ehr = MockEHRAdapter()
    ctx = ToolContext(ehr=ehr, clinic_id=clinic_id, patient_ref=patient_ref,
                      rehydrate=lambda s: s)
    return ctx, ehr


class TestCheckAvailability(unittest.TestCase):
    def test_returns_slots_list(self):
        ctx, _ = _ctx()
        out = CheckAvailability().run({"date_range": "next_7_days"}, ctx)
        self.assertIn("slots", out)
        self.assertIsInstance(out["slots"], list)
        self.assertGreater(len(out["slots"]), 0)

    def test_slot_has_expected_fields(self):
        ctx, _ = _ctx()
        slot = CheckAvailability().run({}, ctx)["slots"][0]
        self.assertIn("id", slot)
        self.assertIn("provider", slot)
        self.assertIn("label", slot)

    def test_empty_args_uses_default_date_range(self):
        ctx, _ = _ctx()
        out = CheckAvailability().run({}, ctx)
        self.assertGreater(len(out["slots"]), 0)

    def test_does_not_require_confirmation(self):
        self.assertFalse(CheckAvailability().requires_confirmation)

    def test_is_not_a_write(self):
        self.assertFalse(getattr(CheckAvailability(), "writes", False))


class TestBookAppointment(unittest.TestCase):
    def test_preview_with_known_slot_names_provider(self):
        ctx, _ = _ctx()
        preview = BookAppointment().preview({"slot_id": "slot_1"}, ctx)
        self.assertIn("Dr. Lee", preview)

    def test_preview_with_unknown_slot_returns_fallback(self):
        ctx, _ = _ctx()
        preview = BookAppointment().preview({"slot_id": "does_not_exist"}, ctx)
        self.assertIsInstance(preview, str)
        self.assertGreater(len(preview), 0)

    def test_run_creates_appointment_in_ehr(self):
        ctx, ehr = _ctx()
        out = BookAppointment().run({"slot_id": "slot_1"}, ctx)
        self.assertIn("appointment", out)
        self.assertEqual(len(ehr._appointments), 1)

    def test_run_appointment_linked_to_patient(self):
        ctx, ehr = _ctx(patient_ref="ptok_42")
        BookAppointment().run({"slot_id": "slot_2"}, ctx)
        appt = list(ehr._appointments.values())[0]
        self.assertEqual(appt.patient_ref, "ptok_42")

    def test_requires_confirmation(self):
        self.assertTrue(BookAppointment().requires_confirmation)

    def test_is_a_write(self):
        self.assertTrue(BookAppointment().writes)


class TestLookupCoverage(unittest.TestCase):
    def test_returns_plan_copay_in_network(self):
        ctx, _ = _ctx()
        out = LookupCoverage().run({}, ctx)
        self.assertIn("plan", out)
        self.assertIn("copay", out)
        self.assertIn("in_network", out)

    def test_plan_is_string(self):
        ctx, _ = _ctx()
        self.assertIsInstance(LookupCoverage().run({}, ctx)["plan"], str)

    def test_does_not_require_confirmation(self):
        self.assertFalse(LookupCoverage().requires_confirmation)


class TestGetBalance(unittest.TestCase):
    def test_returns_balance(self):
        ctx, _ = _ctx()
        out = GetBalance().run({}, ctx)
        self.assertIn("balance", out)

    def test_balance_is_string(self):
        ctx, _ = _ctx()
        self.assertIsInstance(GetBalance().run({}, ctx)["balance"], str)


class TestAssessUrgency(unittest.TestCase):
    def test_returns_urgency_and_recommend(self):
        ctx, _ = _ctx()
        out = AssessUrgency().run({}, ctx)
        self.assertIn("urgency", out)
        self.assertIn("recommend", out)

    def test_does_not_diagnose(self):
        ctx, _ = _ctx()
        out = AssessUrgency().run({}, ctx)
        combined = " ".join(str(v) for v in out.values()).lower()
        self.assertNotIn("diagnos", combined)

    def test_does_not_require_confirmation(self):
        self.assertFalse(AssessUrgency().requires_confirmation)


class TestRouteToNurse(unittest.TestCase):
    def test_returns_routed_nurse_line(self):
        ctx, _ = _ctx()
        out = RouteToNurse().run({}, ctx)
        self.assertIn("routed", out)
        self.assertEqual(out["routed"], "nurse_line")


class TestStartIntake(unittest.TestCase):
    def test_returns_intake_id_and_status(self):
        ctx, _ = _ctx()
        out = StartIntake().run({}, ctx)
        self.assertIn("intake_id", out)
        self.assertEqual(out["status"], "started")

    def test_intake_recorded_in_ehr(self):
        ctx, ehr = _ctx(patient_ref="ptok_intake")
        StartIntake().run({}, ctx)
        self.assertIn("ptok_intake", ehr._intakes)

    def test_intake_id_is_string(self):
        ctx, _ = _ctx()
        self.assertIsInstance(StartIntake().run({}, ctx)["intake_id"], str)


class TestSaveIntakeField(unittest.TestCase):
    def test_saves_field_value(self):
        ctx, _ = _ctx()
        out = SaveIntakeField().run({"field": "dob", "value": "1985-04-12"}, ctx)
        self.assertIn("saved", out)
        self.assertEqual(out["saved"]["dob"], "1985-04-12")

    def test_saves_arbitrary_field(self):
        ctx, _ = _ctx()
        out = SaveIntakeField().run({"field": "insurance_id", "value": "INS-9876"}, ctx)
        self.assertEqual(out["saved"]["insurance_id"], "INS-9876")


class TestToolRegistry(unittest.TestCase):
    def test_scheduling_tools_all_present(self):
        names = {t.name for t in SCHEDULING_TOOLS}
        self.assertIn("check_availability", names)
        self.assertIn("book_appointment", names)

    def test_billing_tools_all_present(self):
        names = {t.name for t in BILLING_TOOLS}
        self.assertIn("lookup_coverage", names)
        self.assertIn("get_balance", names)

    def test_triage_tools_all_present(self):
        names = {t.name for t in TRIAGE_TOOLS}
        self.assertIn("assess_urgency", names)
        self.assertIn("route_to_nurse", names)

    def test_intake_tools_all_present(self):
        names = {t.name for t in INTAKE_TOOLS}
        self.assertIn("start_intake", names)
        self.assertIn("save_intake_field", names)

    def test_tool_by_name_returns_correct_tool(self):
        tool = tool_by_name("scheduling", "check_availability")
        self.assertIsNotNone(tool)
        self.assertEqual(tool.name, "check_availability")

    def test_tool_by_name_unknown_agent_returns_none(self):
        self.assertIsNone(tool_by_name("no_such_agent", "check_availability"))

    def test_tool_by_name_unknown_tool_returns_none(self):
        self.assertIsNone(tool_by_name("scheduling", "no_such_tool"))

    def test_tool_by_name_cross_agent_isolation(self):
        # book_appointment belongs to scheduling, not billing
        self.assertIsNone(tool_by_name("billing", "book_appointment"))


if __name__ == "__main__":
    unittest.main()
