from abc import ABC, abstractmethod


class CRMAdapter(ABC):
    @abstractmethod
    def upsert_contact(self, patient_ref: str, attrs: dict) -> None: ...

    @abstractmethod
    def log_interaction(self, patient_ref: str, summary: str) -> None: ...
