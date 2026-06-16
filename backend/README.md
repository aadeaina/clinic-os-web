# Clinic OS — Backend (Django + orchestration core)

Intent router → specialist agents, with PHI redaction, scoped tools, two-phase writes,
escalation, and an EHR anti-corruption layer. The orchestration core is pure-Python (stdlib
only) so it runs and is unit-tested with no framework, no network, and no API key.

## Run offline in 30 seconds (no install)
```bash
cd backend
python3 -m unittest tests.test_core -v   # 11 tests, all pass
python3 demo.py                          # streams a scheduling+confirm and an urgent triage
```

## Run the API
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                     # LLM_PROVIDER=mock by default (offline)
python manage.py migrate
python manage.py seed                    # prints a clinic id for the clients
python manage.py runserver               # http://localhost:8000
```

### Endpoints
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/events` | ingest an event, run the turn, return `{session_id}` |
| GET | `/api/sessions/{id}/stream` | SSE replay of the turn's steps |
| POST | `/api/sessions/{id}/confirm` | commit a pending write → `{steps}` |
| GET | `/api/sessions` · `/api/sessions/{id}` | list / timeline |
| GET | `/api/analytics/summary` | containment, escalation, intent mix |

## LLM providers
`LLM_PROVIDER` = `mock` (default, deterministic, offline) · `anthropic` (set `ANTHROPIC_API_KEY`)
· `bedrock` (Claude in your VPC under the AWS BAA). Models are configurable
(`ROUTER_MODEL=claude-haiku-4-5`, `AGENT_MODEL=claude-sonnet-4-6`). Redaction runs before any
provider call, so the model never receives raw PHI.

## Design guarantees (verified in tests/test_core.py)
- **Two-phase writes** — `book_appointment` is proposed (`pending`) and only commits on
  `/confirm`. The model cannot create a phantom appointment. Double-confirm is rejected.
- **Triage routes urgency only** — urgent symptoms escalate immediately; no diagnosis.
- **PHI redaction + rehydration** — only redacted text is persisted; raw values live in a
  separate, access-controlled map.
- **Scoped tools** — each agent can call only its own tools.
