from .base import CRMAdapter


class MockCRMAdapter(CRMAdapter):
    def __init__(self):
        self.contacts: dict[str, dict] = {}
        self.interactions: list[tuple[str, str]] = []

    def upsert_contact(self, patient_ref: str, attrs: dict) -> None:
        self.contacts.setdefault(patient_ref, {}).update(attrs)

    def log_interaction(self, patient_ref: str, summary: str) -> None:
        self.interactions.append((patient_ref, summary))
