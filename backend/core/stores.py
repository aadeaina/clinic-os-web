"""Django implementation of the engine's SessionStore (ORM-backed)."""
from __future__ import annotations

from orchestration.store import SessionStore
from orchestration.schemas import RoutingDecision
from .models import (
    Session, Message, RoutingDecision as RoutingM, ToolCall, PendingAction, AuditLog, Clinic,
)


class DjangoSessionStore(SessionStore):
    def create_or_get_session(self, clinic_id, channel, patient_ref, session_id) -> str:
        if session_id:
            existing = Session.objects.filter(id=session_id).first()
            if existing:
                return str(existing.id)
        clinic = Clinic.objects.filter(id=clinic_id).first() if clinic_id else None
        s = Session.objects.create(clinic=clinic, channel=channel, patient_ref=patient_ref)
        return str(s.id)

    def get_session(self, session_id) -> dict | None:
        s = Session.objects.filter(id=session_id).first()
        if not s:
            return None
        return {"id": str(s.id), "clinic_id": str(s.clinic_id) if s.clinic_id else "",
                "channel": s.channel, "patient_ref": s.patient_ref,
                "status": s.status, "contained": s.contained}

    def add_message(self, session_id, role, text_redacted) -> None:
        Message.objects.create(session_id=session_id, role=role, text_redacted=text_redacted)

    def save_routing(self, session_id, decision: RoutingDecision) -> None:
        RoutingM.objects.create(
            session_id=session_id, intent=decision.intent, agent=decision.agent,
            confidence=decision.confidence, urgent=decision.urgent, rationale=decision.rationale)

    def record_tool_call(self, session_id, name, _input, output, status="ok") -> None:
        ToolCall.objects.create(session_id=session_id, name=name, input=_input,
                                output=output, status=status)

    def create_pending(self, session_id, agent_key, name, args, summary) -> str:
        p = PendingAction.objects.create(session_id=session_id, agent_key=agent_key,
                                         name=name, args=args, summary=summary)
        return str(p.id)

    def get_pending(self, action_id) -> dict | None:
        p = PendingAction.objects.filter(id=action_id).first()
        if not p:
            return None
        return {"id": str(p.id), "session_id": str(p.session_id), "agent_key": p.agent_key,
                "name": p.name, "args": p.args, "summary": p.summary, "state": p.state}

    def mark_pending_committed(self, action_id) -> None:
        PendingAction.objects.filter(id=action_id).update(state="committed")

    def set_contained(self, session_id, value) -> None:
        Session.objects.filter(id=session_id).update(contained=value)

    def set_status(self, session_id, status) -> None:
        Session.objects.filter(id=session_id).update(status=status)

    def audit(self, session_id, event_type, ref, payload_redacted) -> None:
        payload = payload_redacted if isinstance(payload_redacted, dict) else {"text": str(payload_redacted)}
        AuditLog.objects.create(session_id=session_id, event_type=event_type,
                                ref=str(ref), payload_redacted=payload)
