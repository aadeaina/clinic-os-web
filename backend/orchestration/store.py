"""Persistence abstraction for the engine.

The engine depends only on this interface, so it can run against an in-memory store
(tests, offline demo) or a Django-backed store (the API) with no code changes.
"""
from __future__ import annotations

from abc import ABC, abstractmethod

from .schemas import RoutingDecision, new_id


class SessionStore(ABC):
    @abstractmethod
    def create_or_get_session(self, clinic_id, channel, patient_ref, session_id) -> str: ...
    @abstractmethod
    def get_session(self, session_id) -> dict | None: ...
    @abstractmethod
    def add_message(self, session_id, role, text_redacted) -> None: ...
    @abstractmethod
    def save_routing(self, session_id, decision: RoutingDecision) -> None: ...
    @abstractmethod
    def record_tool_call(self, session_id, name, _input, output, status="ok") -> None: ...
    @abstractmethod
    def create_pending(self, session_id, agent_key, name, args, summary) -> str: ...
    @abstractmethod
    def get_pending(self, action_id) -> dict | None: ...
    @abstractmethod
    def mark_pending_committed(self, action_id) -> None: ...
    @abstractmethod
    def set_contained(self, session_id, value) -> None: ...
    @abstractmethod
    def set_status(self, session_id, status) -> None: ...
    @abstractmethod
    def audit(self, session_id, event_type, ref, payload_redacted) -> None: ...


class InMemorySessionStore(SessionStore):
    def __init__(self):
        self.sessions: dict[str, dict] = {}
        self.messages: list[dict] = []
        self.tool_calls: list[dict] = []
        self.pending: dict[str, dict] = {}
        self.audit_log: list[dict] = []

    def create_or_get_session(self, clinic_id, channel, patient_ref, session_id) -> str:
        if session_id and session_id in self.sessions:
            return session_id
        sid = session_id or new_id()
        self.sessions[sid] = {
            "id": sid, "clinic_id": clinic_id, "channel": channel,
            "patient_ref": patient_ref, "status": "active", "contained": None,
        }
        return sid

    def get_session(self, session_id) -> dict | None:
        return self.sessions.get(session_id)

    def add_message(self, session_id, role, text_redacted) -> None:
        self.messages.append({"session_id": session_id, "role": role,
                              "text_redacted": text_redacted})

    def save_routing(self, session_id, decision: RoutingDecision) -> None:
        self.sessions[session_id]["routing"] = decision.to_dict()

    def record_tool_call(self, session_id, name, _input, output, status="ok") -> None:
        self.tool_calls.append({"session_id": session_id, "name": name,
                               "input": _input, "output": output, "status": status})

    def create_pending(self, session_id, agent_key, name, args, summary) -> str:
        aid = new_id()
        self.pending[aid] = {"id": aid, "session_id": session_id, "agent_key": agent_key,
                             "name": name, "args": args, "summary": summary, "state": "pending"}
        return aid

    def get_pending(self, action_id) -> dict | None:
        return self.pending.get(action_id)

    def mark_pending_committed(self, action_id) -> None:
        if action_id in self.pending:
            self.pending[action_id]["state"] = "committed"

    def set_contained(self, session_id, value) -> None:
        self.sessions[session_id]["contained"] = value

    def set_status(self, session_id, status) -> None:
        self.sessions[session_id]["status"] = status

    def audit(self, session_id, event_type, ref, payload_redacted) -> None:
        self.audit_log.append({"session_id": session_id, "event_type": event_type,
                              "ref": ref, "payload_redacted": payload_redacted})
