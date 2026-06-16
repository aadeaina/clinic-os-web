"""Unit tests for orchestration.guardrails — pure stdlib, no Django, no network.

Run from the backend/ directory:
    python3 -m unittest tests.test_guardrails -v
"""
import unittest

from orchestration import guardrails
from orchestration.tools.scheduling_tools import BookAppointment
from orchestration.tools.intake_tools import SaveIntakeField


class TestScanOutput(unittest.TestCase):
    def test_clean_text_passes(self):
        self.assertFalse(guardrails.scan_output("Your appointment is confirmed for Monday."))

    def test_ssn_detected(self):
        self.assertTrue(guardrails.scan_output("SSN: 123-45-6789"))

    def test_email_detected(self):
        self.assertTrue(guardrails.scan_output("Contact jane@example.com for help."))

    def test_phone_ten_digit_detected(self):
        self.assertTrue(guardrails.scan_output("Call 512-555-0199 for more info."))

    def test_phone_with_country_code_detected(self):
        self.assertTrue(guardrails.scan_output("Reach us at +1 (800) 555-1234."))

    def test_phone_dot_separated_detected(self):
        self.assertTrue(guardrails.scan_output("My number is 512.555.0199."))

    def test_empty_text_passes(self):
        self.assertFalse(guardrails.scan_output(""))

    def test_redacted_token_passes(self):
        self.assertFalse(guardrails.scan_output("Patient [PHONE_1] called about [NAME_1]."))

    def test_multiple_phi_any_triggers(self):
        self.assertTrue(guardrails.scan_output("Call 512-555-0199 or email jane@example.com"))


class TestValidateToolInput(unittest.TestCase):
    def test_book_appointment_valid(self):
        tool = BookAppointment()
        guardrails.validate_tool_input(tool, {"slot_id": "slot_1"})  # must not raise

    def test_book_appointment_missing_required_raises(self):
        tool = BookAppointment()
        with self.assertRaises(ValueError) as cm:
            guardrails.validate_tool_input(tool, {})
        self.assertIn("slot_id", str(cm.exception))

    def test_save_intake_field_valid(self):
        tool = SaveIntakeField()
        guardrails.validate_tool_input(tool, {"field": "dob", "value": "1985-04-12"})

    def test_save_intake_field_missing_both_raises(self):
        tool = SaveIntakeField()
        with self.assertRaises(ValueError) as cm:
            guardrails.validate_tool_input(tool, {})
        err = str(cm.exception)
        self.assertIn("field", err)

    def test_save_intake_field_missing_one_raises(self):
        tool = SaveIntakeField()
        with self.assertRaises(ValueError) as cm:
            guardrails.validate_tool_input(tool, {"field": "dob"})
        self.assertIn("value", str(cm.exception))

    def test_extra_args_do_not_raise(self):
        tool = BookAppointment()
        guardrails.validate_tool_input(tool, {"slot_id": "slot_1", "notes": "extra"})

    def test_no_required_schema_always_passes(self):
        from orchestration.tools.billing_tools import LookupCoverage
        tool = LookupCoverage()
        guardrails.validate_tool_input(tool, {})
        guardrails.validate_tool_input(tool, {"anything": "goes"})


if __name__ == "__main__":
    unittest.main()
