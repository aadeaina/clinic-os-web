# Clinic OS

An AI operating system for patient operations across a clinic network: a fast **intent
router** dispatches each message to one **specialist agent** (scheduling, intake, triage,
billing), which runs a guarded tool-use loop against an EHR/CRM anti-corruption layer.
Every step streams to the clients. HIPAA-aware by construction.

```
event ─▶ Intent Router (Haiku) ─▶ specialist agent (Sonnet) ─▶ scoped tools ─▶ EHR/CRM adapters
              │                          │
        routing decision        two-phase writes · PHI redaction · audit · escalation
```

## What's in the box
| Path | What | Runs |
|---|---|---|
| `backend/` | Django API + **pure-Python orchestration core** | ✅ runs & is **tested offline** (mock provider); add a key for Anthropic/Bedrock |
| `web/` | Next.js operator console | `npm install && npm run dev` |
| `ios/` | SwiftUI patient app | open in Xcode (XcodeGen `project.yml`) |
| `android/` | Kotlin/Compose patient app | open in Android Studio |

All clients share one contract: `POST /api/events` → `GET /api/sessions/{id}/stream` (SSE) →
`POST /api/sessions/{id}/confirm`.

## Start here (no installs, no key)
```bash
cd backend
python3 -m unittest tests.test_core -v   # 11/11 pass
python3 demo.py
```
`demo.py` output shows the core guarantees:
- scheduling → `check_availability` → `book_appointment` → **pending** with **0 appointments
  booked**, then `/confirm` → **1 appointment** (two-phase write);
- "chest pain and shortness of breath" → **routing(urgent) → escalate**, nothing booked;
- stored inbound text appears redacted: `My name is [NAME_1], reach me at [PHONE_1]`.

## Then run it for real
Backend API + console: see `backend/README.md` and `web/README.md`.
Mobile: `ios/README.md`, `android/README.md`. Simulator/emulator base URLs:
iOS sim → `http://localhost:8000`, Android emulator → `http://10.0.2.2:8000`.

## HIPAA posture
PHI is redacted before any model call and rehydrated only for real EHR writes; only redacted
text is persisted. Writes are two-phase. Triage never diagnoses. Mobile clients persist no
conversation PHI (token only, in Keychain / EncryptedSharedPreferences) and lock behind
biometrics. For production: sign BAAs with every PHI-touching vendor, run inference via
Anthropic's HIPAA-enabled API or Bedrock-in-VPC, and encrypt the rehydration map (KMS).

> Names, outcome figures, and "Cadence" deck branding are illustrative scaffolding, not
> validated clinical claims.
