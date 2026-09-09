"""HTTP API.

POST /api/events                     ingest a conversation event, run the turn, return {session_id}
GET  /api/sessions/{id}/stream       SSE replay of the session's steps
POST /api/sessions/{id}/confirm      commit a pending write, return {steps:[...]}
GET  /api/sessions                   list sessions
GET  /api/sessions/{id}              full timeline
GET  /api/analytics/summary          aggregate metrics

The orchestration turn runs at ingest time (in-memory redaction; only redacted data is
persisted) and its steps are saved for SSE replay. Swap to run-during-stream for token-live
output once you move the engine to async.
"""
import json

from django.http import StreamingHttpResponse, JsonResponse, Http404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from core.stores import DjangoSessionStore
from core.models import Session, Step, PendingAction
from integrations.ehr.mock import MockEHRAdapter
from orchestration import engine
from orchestration.llm import get_provider
from orchestration.schemas import ConversationEvent

from .authentication import BridgeTokenAuthentication, verify_bridge_token
from .permissions import IsStaff

_PROVIDER = get_provider()
_EHR = MockEHRAdapter()
_STORE = DjangoSessionStore()


def _persist_steps(session_id, steps, start_idx=0):
    for i, step in enumerate(steps, start=start_idx):
        Step.objects.create(session_id=session_id, idx=i, type=step["type"], payload=step)


@api_view(["POST"])
def events(request):
    body = request.data
    event = ConversationEvent(
        clinic_id=body.get("clinic_id", ""),
        channel=body.get("channel", "app"),
        patient_ref=body.get("patient_ref", "anon"),
        text=body.get("text", ""),
        session_id=body.get("session_id"),
    )
    try:
        event.validate()
    except ValueError as e:
        return Response({"error": str(e)}, status=400)

    # Resolve/create the session up front so we can return its id, then run the turn.
    session_id = _STORE.create_or_get_session(
        event.clinic_id, event.channel, event.patient_ref, event.session_id)
    event.session_id = session_id

    steps = [s.to_dict() for s in engine.run_turn(event, provider=_PROVIDER, store=_STORE, ehr=_EHR)]
    # run_turn created/used the session; persist steps for replay.
    existing = Step.objects.filter(session_id=session_id).count()
    _persist_steps(session_id, steps, start_idx=existing)
    return Response({"session_id": session_id})


def _sse(steps):
    def gen():
        for step in steps:
            yield f"data: {json.dumps(step)}\n\n"
        yield "event: done\ndata: {}\n\n"
    resp = StreamingHttpResponse(gen(), content_type="text/event-stream")
    resp["Cache-Control"] = "no-cache"
    resp["X-Accel-Buffering"] = "no"
    return resp


def stream(request, session_id):
    # Plain Django view, not @api_view: DRF's api_view runs content negotiation against the
    # Accept header before the handler executes, and its default renderers don't include
    # text/event-stream — so a real browser EventSource (which sends that Accept header) gets
    # a 406 before ever reaching this function, even though it returns a raw SSE response.
    # Being a plain view also means DRF's DEFAULT_AUTHENTICATION/PERMISSION_CLASSES never run
    # here, so the bridge token is checked by hand instead.
    if request.method != "GET":
        return JsonResponse({"detail": 'Method "%s" not allowed.' % request.method}, status=405)
    # Browser EventSource can't set custom headers, so this one endpoint also accepts the
    # bridge token as a short-lived query param (?token=...) in addition to the standard
    # Authorization header used everywhere else.
    try:
        principal = BridgeTokenAuthentication().authenticate(request)
    except Exception:
        principal = None
    if principal is None and request.GET.get("token"):
        principal = (verify_bridge_token(request.GET["token"]), None)
        if principal[0] is None:
            principal = None
    if principal is None:
        return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
    if not Session.objects.filter(id=session_id).exists():
        raise Http404
    steps = list(Step.objects.filter(session_id=session_id).values_list("payload", flat=True))
    return _sse(steps)


@api_view(["POST"])
def confirm(request, session_id):
    action_id = request.data.get("action_id")
    steps = [s.to_dict() for s in engine.confirm(session_id, action_id, store=_STORE, ehr=_EHR)]
    existing = Step.objects.filter(session_id=session_id).count()
    _persist_steps(session_id, steps, start_idx=existing)
    return Response({"steps": steps})


@api_view(["GET"])
@permission_classes([IsStaff])
def sessions(request):
    rows = []
    for s in Session.objects.order_by("-created")[:100]:
        routing = s.routings.last()
        rows.append({
            "id": str(s.id), "channel": s.channel, "status": s.status,
            "contained": s.contained,
            "intent": routing.intent if routing else None,
            "created": s.created.isoformat(),
        })
    return Response(rows)


@api_view(["GET"])
@permission_classes([IsStaff])
def session_detail(request, session_id):
    s = Session.objects.filter(id=session_id).first()
    if not s:
        raise Http404
    return Response({
        "id": str(s.id), "channel": s.channel, "status": s.status, "contained": s.contained,
        "messages": [{"role": m.role, "text": m.text_redacted} for m in s.messages.all()],
        "tool_calls": [{"name": t.name, "input": t.input, "output": t.output}
                       for t in s.tool_calls.all()],
        "pending": [{"id": str(p.id), "name": p.name, "summary": p.summary, "state": p.state}
                    for p in s.pending_actions.all()],
        "steps": list(s.steps.values_list("payload", flat=True)),
    })


@api_view(["GET"])
@permission_classes([IsStaff])
def analytics_summary(request):
    total = Session.objects.count()
    contained = Session.objects.filter(contained=True).count()
    escalated = Session.objects.filter(status="escalated").count()
    by_intent = {}
    for s in Session.objects.all():
        r = s.routings.last()
        key = r.intent if r else "unknown"
        by_intent[key] = by_intent.get(key, 0) + 1
    return Response({
        "total_sessions": total,
        "containment_rate": round(contained / total, 3) if total else 0,
        "escalation_rate": round(escalated / total, 3) if total else 0,
        "by_intent": by_intent,
    })
