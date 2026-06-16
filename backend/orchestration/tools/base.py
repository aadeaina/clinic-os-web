"""Tool interface.

Tools are typed callables an agent may invoke. `writes` marks mutation of a system of
record; `requires_confirmation` gates that mutation behind an explicit /confirm call:
such a tool exposes `preview()` (no write, returns a summary) for the proposal, and
`run()` (the real write) only after the patient/operator confirms.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from integrations.ehr.base import EHRAdapter


@dataclass
class ToolContext:
    ehr: EHRAdapter
    clinic_id: str
    patient_ref: str
    rehydrate: callable  # token-string -> raw-string, for real writes


class Tool(ABC):
    name: str = ""
    description: str = ""
    input_schema: dict = {"type": "object", "properties": {}}
    writes: bool = False
    requires_confirmation: bool = False

    @abstractmethod
    def run(self, args: dict, ctx: ToolContext) -> dict: ...

    def preview(self, args: dict, ctx: ToolContext) -> str:
        """Human-readable summary for a confirm-required action. No side effects."""
        return f"{self.name} {args}"
