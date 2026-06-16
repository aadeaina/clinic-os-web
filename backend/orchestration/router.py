"""Thin wrapper over the provider's fast router call."""
from __future__ import annotations

from .schemas import RoutingDecision


def route(provider, redacted_text: str, history: list[dict]) -> RoutingDecision:
    decision = provider.route(redacted_text, history)
    # Low-confidence routing is escalated to a human.
    if decision.confidence < 0.55 and decision.intent != "smalltalk":
        return RoutingDecision("escalate", None, decision.confidence, decision.urgent,
                               "low router confidence")
    return decision
