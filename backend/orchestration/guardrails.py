"""Guardrails applied around the model and tool execution."""
from __future__ import annotations

import re

_LEAK = [
    re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),                  # SSN
    re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"),           # email
    re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),  # phone
]

MAX_TOOL_ITERATIONS = 6


def scan_output(text: str) -> bool:
    """True if the model output appears to leak a raw identifier (should be blocked)."""
    return any(p.search(text) for p in _LEAK)


def validate_tool_input(tool, args: dict) -> None:
    required = tool.input_schema.get("required", [])
    missing = [k for k in required if k not in args]
    if missing:
        raise ValueError(f"{tool.name} missing required args: {missing}")
