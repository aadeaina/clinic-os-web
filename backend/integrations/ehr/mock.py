"""In-memory EHR adapter. Seeded, deterministic, no external dependencies."""
from __future__ import annotations

import uuid
from .base import EHRAdapter, Slot, Appointment, Coverage

_SLOTS = [
    Slot("slot_1", "Dr. Lee", "2026-06-17T14:30:00", "Tue Jun 17, 2:30 PM"),
    Slot("slot_2", "Dr. Lee", "2026-06-18T09:00:00", "Wed Jun 18, 9:00 AM"),
    Slot("slot_3", "Dr. Patel", "2026-06-19T11:15:00", "Thu Jun 19, 11:15 AM"),
]


class MockEHRAdapter(EHRAdapter):
    def __init__(self):
        self._appointments: dict[str, Appointment] = {}
        self._intakes: dict[str, str] = {}

    def get_slots(self, clinic_id: str, date_range: str) -> list[Slot]:
        return list(_SLOTS)

    def get_slot(self, slot_id: str) -> Slot | None:
        return next((s for s in _SLOTS if s.id == slot_id), None)

    def create_appointment(self, slot_id: str, patient_ref: str) -> Appointment:
        slot = self.get_slot(slot_id) or _SLOTS[0]
        appt = Appointment(
            id=f"appt_{uuid.uuid4().hex[:8]}", slot_id=slot.id,
            patient_ref=patient_ref, provider=slot.provider, label=slot.label,
        )
        self._appointments[appt.id] = appt
        return appt

    def start_intake(self, patient_ref: str) -> str:
        intake_id = f"intake_{uuid.uuid4().hex[:8]}"
        self._intakes[patient_ref] = intake_id
        return intake_id

    def get_coverage(self, patient_ref: str) -> Coverage:
        return Coverage(plan="BlueCross PPO", copay="$25", in_network=True)
