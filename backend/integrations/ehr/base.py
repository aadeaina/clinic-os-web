"""Canonical EHR interface (anti-corruption layer).

Agents and tools speak this interface only. Concrete adapters translate to a specific
EHR (mock for dev, FHIR stub for real). No agent imports a vendor SDK directly.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict


@dataclass
class Slot:
    id: str
    provider: str
    start: str   # ISO8601
    label: str   # human-readable, e.g. "Tue Jun 17, 2:30 PM"

    def to_dict(self):
        return asdict(self)


@dataclass
class Appointment:
    id: str
    slot_id: str
    patient_ref: str
    provider: str
    label: str

    def to_dict(self):
        return asdict(self)


@dataclass
class Coverage:
    plan: str
    copay: str
    in_network: bool

    def to_dict(self):
        return asdict(self)


class EHRAdapter(ABC):
    @abstractmethod
    def get_slots(self, clinic_id: str, date_range: str) -> list[Slot]: ...

    @abstractmethod
    def get_slot(self, slot_id: str) -> Slot | None: ...

    @abstractmethod
    def create_appointment(self, slot_id: str, patient_ref: str) -> Appointment: ...

    @abstractmethod
    def start_intake(self, patient_ref: str) -> str: ...

    @abstractmethod
    def get_coverage(self, patient_ref: str) -> Coverage: ...
