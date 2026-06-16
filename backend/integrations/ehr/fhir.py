"""FHIR R4 adapter stub.

Real implementation talks to a SMART-on-FHIR endpoint (Epic / Oracle Health / athenahealth).
Method signatures match the canonical interface so the engine is unchanged. TODOs mark the
HTTP/FHIR-resource work.
"""
from __future__ import annotations

from .base import EHRAdapter, Slot, Appointment, Coverage


class FHIRAdapter(EHRAdapter):
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token

    def get_slots(self, clinic_id: str, date_range: str) -> list[Slot]:
        # TODO: GET {base}/Slot?schedule.actor={clinic}&start=ge{from}&start=le{to}
        raise NotImplementedError("wire SMART-on-FHIR Slot search")

    def get_slot(self, slot_id: str) -> Slot | None:
        # TODO: GET {base}/Slot/{id}
        raise NotImplementedError

    def create_appointment(self, slot_id: str, patient_ref: str) -> Appointment:
        # TODO: POST {base}/Appointment  (status=booked, references Slot + Patient)
        raise NotImplementedError

    def start_intake(self, patient_ref: str) -> str:
        # TODO: create QuestionnaireResponse / encounter pre-registration
        raise NotImplementedError

    def get_coverage(self, patient_ref: str) -> Coverage:
        # TODO: GET {base}/Coverage?patient={ref}
        raise NotImplementedError
