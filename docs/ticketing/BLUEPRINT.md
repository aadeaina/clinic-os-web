# Ticketing Module — Implementation Blueprint

[`SPEC.md`](./SPEC.md) is the target-state design, written independently of the running
codebase. This document reconciles it with what's actually on disk and lays out the
phased build order. Read the reconciliation notes first — they change model shape and are
cheaper to resolve now than mid-Phase-2.

## Reconciliation with the existing codebase

**1. `Clinic` vs. `Organization` → `Location`.**
The spec assumes multi-tenant `Organization` → `Location`. The running codebase has one
flat `Clinic` (`backend/core/models.py:6`), already FK'd from `Session`, `AuditLog`, and
everything else in `core`. Recommended: don't replace `Clinic` — add `Organization` as a
new parent above it and treat existing `Clinic` rows as `Location`s. Additive, not a
breaking migration.

**2. Staff auth is a demo mock, not a real backend.**
This is the one that actually blocks Phase 2. `web/lib/auth.ts` is explicitly labeled
"Demo auth — tokens are unsigned base64" with a hardcoded user list and an 8-hour
client-side-verified token; it has no connection to the Django backend at all. The spec's
two-phase PHI gate (`DeskSession` → PHI reachable) is meaningless if the session backing
it isn't real — anyone can mint a token client-side. **This needs to become a real,
Django-backed session before Phase 2 starts, not after.** Good news: the role model is
already right — `web/lib/auth.ts` already defines a `front_desk` role alongside `admin`,
`doctor`, `billing`, `nurse`, with route-level access control (`ROUTE_ROLES`) already
wired in `middleware.ts`. `front_desk` maps directly to the spec's desk-operator concept;
extend it rather than inventing a parallel `Administrator` entity from scratch — back it
with Django's `auth.User` + a `Profile` model carrying `role`, `badge_id`, and
`organization` scope.

**3. `AuditLog` already exists — reuse it.**
`core.models.AuditLog` has `event_type`, `ref`, `payload_redacted`, and a **nullable**
`session` FK (`null=True, on_delete=SET_NULL`). Ticketing audit events
(`PHI_VIEWED`, `TICKET_CALLED`, …) can write directly into this table —
`session=None`, `ref=ticket_id` — instead of standing up a second audit table. One
compliance surface, not two.

**4. `core/redaction.py` doesn't apply here, but its principle does.**
The existing redaction module is a free-text regex pipeline that scrubs PHI out of chat
messages before they reach an LLM — it has nothing to do with structured fields like
`Client.date_of_birth`. Don't try to route ticketing PHI through it. What *does* carry
over is the underlying discipline the orchestration side already proves out: PHI is never
in the default read path, only reachable through an explicit, audited step (there:
rehydration map + `/confirm`; here: `DeskSession` + `call-next`). Same shape, different
mechanism.

## App structure — follow the existing convention, don't fork it

The backend currently uses two Django apps — `core` (models) and `api`
(serializers/views/urls) — rather than one app per domain. `config/urls.py` mounts
everything under `api/`. Match that instead of introducing a `queue` app:

- Add ticketing models to `core/models.py` (split into `core/models_queue.py`,
  re-exported, only if the file gets genuinely unwieldy — not required to start).
- Add ticketing serializers/views to `api/`, routes appended to `api/urls.py`
  (e.g. `api/queue/checkin`, `api/queue/desks/<id>/call-next`, …).
- New models: `Organization`, `ThemeProfile`, `Service`, `ServicePoint`, `DeskSession`,
  `Booking`, `Client`, `Ticket`, `RoutingRule`. (`Clinic` becomes `Location` per note 1;
  `AuditLog` reused as-is per note 3.)

On the frontend, `web/app/(staff)/` and `web/app/(patient)/` route groups already encode
exactly the split this module needs:

- `web/app/(staff)/queue/` — desk console (Call Next / Serve / Complete / …)
- `web/app/(staff)/queue/admin/` (or a new `(staff)/floor/`) — floor view, routing rules, reports
- `web/app/(patient)/kiosk/` — check-in + ticket-number-only status view — **check
  `middleware.ts`'s `PUBLIC` list before assuming this is reachable without patient auth;
  the spec requires it to be unauthenticated.**

## Build phases

Dependency-ordered; each phase's acceptance criteria gate the next.

### Phase 0 — Reconciliation + tenancy
- Resolve notes 1–3 above as actual migrations, not just docs
- `Organization` model; existing `Clinic` rows backfilled with a default org and treated as `Location`
- **Acceptance:** existing orchestration tests (`backend/tests/test_core.py`) still pass unmodified; every `Clinic` row resolves an `Organization`

### Phase 1 — Real staff auth (blocks everything PHI-adjacent)
- Django-backed session (or signed JWT) replacing `web/lib/auth.ts`'s unsigned token
- `auth.User` + `Profile` (`role`, `badge_id`, `organization`) — `front_desk` role extended, not replaced
- **Acceptance:** a token cannot be forged client-side; `ROUTE_ROLES` checks resolve against real backend state

### Phase 2 — Core queue primitives, no PHI
- `Service`, `ServicePoint`, `Ticket` + state machine as an explicit transition table (illegal transitions rejected) — same rigor as the existing `PendingAction` two-phase pattern
- `POST /api/queue/checkin/kiosk`, `GET /api/queue/tickets/{ticket_number}/status`
- **Acceptance:** a ticket issues and its status polls; ISSUED→COMPLETED (skipping states) is rejected with a clear error

### Phase 3 — Desk identity + two-phase PHI gate
- `DeskSession` (PIN/badge claim against the now-real `auth.User`), `Client`, `Booking`, phone-link check-in match
- `call-next` resolves PHI only after an active `DeskSession`, writes to the existing `AuditLog`
- **Acceptance:** no endpoint returns Client PHI without an active DeskSession + a `call-next` having executed; every PHI read produces an AuditLog row

### Phase 4 — Desk console actions + `web/app/(staff)/queue/`
- serve / complete / no-show / requeue / hold / resume endpoints
- Console UI wired to them, PIN claim flow
- **Acceptance:** full ticket lifecycle operable end-to-end from the UI

### Phase 5 — Real-time layer
- NATS JetStream event publishing per transition — **new infra dependency, not currently in the stack.** The orchestration side already streams over SSE (`GET /api/sessions/{id}/stream`); confirm NATS is worth the extra moving part over extending that existing SSE pattern before committing infra.
- WS/SSE gateways for client board, desk console, admin
- **Acceptance:** a call reflects on the public board in <1s without polling

### Phase 6 — Admin dashboard + routing/reporting
- Floor view, `RoutingRule` CRUD, priority override, reassign, escalations, wait-time reports
- **Acceptance:** admin can view live floor, override priority, pull a wait-time report

### Phase 7 — Theming
- `ThemeProfile`, `/api/queue/branding`, contrast validation, token injection into console + kiosk
- **Acceptance:** two orgs render distinct, contrast-passing brand colors on one build

### Phase 8 — Native clients
- iOS (`ios/Sources`) / Android (`android/app`): phone-link check-in, status view, themed via the same token payload
- **Acceptance:** feature parity with kiosk/web for check-in + status

### Phase 9 (directional) — AI-augmented operations
- MCP tools wrapping Phase 6 admin endpoints
- Non-PHI agent suggestion queue for desk rebalancing
- **Gate:** nothing PHI-touching ships without a confirmed BAA-covered model path — the same posture the backend README already states for the orchestration side (`LLM_PROVIDER=anthropic|bedrock`, redact-before-call)

## First concrete tickets (Phase 0 → Phase 1 kickoff)

- [ ] `Organization` model + migration; backfill existing `Clinic` rows with a default org
- [ ] Decide: rename `Clinic`→`Location` in code, or keep the name and just add the FK — either works, pick one and note it in the model docstring
- [ ] Replace `web/lib/auth.ts`'s unsigned-token demo auth with a real Django-backed session — this is the actual blocker for the PHI gate, not a nice-to-have
- [ ] `Ticket` state machine as an explicit transition table + one test per legal/illegal transition (extend `backend/tests/test_core.py`'s existing pattern)
- [ ] Kiosk check-in + status endpoints, added to `api/urls.py`

## Non-goals for v1

- The generic "queueing-core" vs. HIPAA-profile split discussed alongside the original spec — revisit after Phase 4 proves the model out for one vertical
- Phase 9 (AI roadmap) beyond design
