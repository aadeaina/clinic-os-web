"""PHI minimization.

Redacts identifiers from free text BEFORE it reaches any LLM, replacing each with a
stable token. A per-session rehydration map (token -> real value) is kept server-side so
real EHR writes can use true values while the model only ever sees tokens.

This is intentionally conservative and pattern-based. A production system would layer a
trained PHI/PII detector on top; the interface (redact / rehydrate) stays the same.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# Order matters: more specific patterns first so they win.
_PATTERNS = [
    ("SSN", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("EMAIL", re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b")),
    ("PHONE", re.compile(r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
    ("DOB", re.compile(r"\b(?:0?[1-9]|1[0-2])[/-](?:0?[1-9]|[12]\d|3[01])[/-](?:19|20)\d{2}\b")),
    ("MRN", re.compile(r"\bMRN[:#\s]*([A-Z0-9]{5,})\b", re.IGNORECASE)),
]

# "my name is John Smith", "I'm Jane Doe", "this is Bob"
_NAME = re.compile(
    r"\b(?:my name is|i am|i'm|this is|name's)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    re.IGNORECASE,
)


@dataclass
class Redacted:
    text: str
    rehydration: dict = field(default_factory=dict)  # token -> raw value

    def rehydrate(self, s: str) -> str:
        for token, raw in self.rehydration.items():
            s = s.replace(token, raw)
        return s


def redact(text: str) -> Redacted:
    counters: dict[str, int] = {}
    mapping: dict[str, str] = {}

    def _token(kind: str, raw: str) -> str:
        counters[kind] = counters.get(kind, 0) + 1
        token = f"[{kind}_{counters[kind]}]"
        mapping[token] = raw
        return token

    out = text

    # Named-capture patterns (replace group 1, keep the lead-in phrase readable).
    def _name_sub(m: re.Match) -> str:
        raw = m.group(1)
        token = _token("NAME", raw)
        return m.group(0).replace(raw, token)

    out = _NAME.sub(_name_sub, out)

    for kind, pat in _PATTERNS:
        def _sub(m: re.Match, _kind=kind) -> str:
            raw = m.group(0)
            return _token(_kind, raw)
        out = pat.sub(_sub, out)

    return Redacted(text=out, rehydration=mapping)
