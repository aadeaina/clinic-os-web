import uuid

from django.db import models


class Clinic(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)


class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clinic = models.ForeignKey(Clinic, null=True, on_delete=models.SET_NULL)
    channel = models.CharField(max_length=16)
    patient_ref = models.CharField(max_length=64)
    status = models.CharField(max_length=16, default="active")
    contained = models.BooleanField(null=True)
    created = models.DateTimeField(auto_now_add=True)


class Message(models.Model):
    session = models.ForeignKey(Session, related_name="messages", on_delete=models.CASCADE)
    role = models.CharField(max_length=16)            # patient | agent
    text_redacted = models.TextField()                # never raw PHI
    created = models.DateTimeField(auto_now_add=True)


class RoutingDecision(models.Model):
    session = models.ForeignKey(Session, related_name="routings", on_delete=models.CASCADE)
    intent = models.CharField(max_length=16)
    agent = models.CharField(max_length=16, null=True)
    confidence = models.FloatField()
    urgent = models.BooleanField(default=False)
    rationale = models.CharField(max_length=200, blank=True)
    created = models.DateTimeField(auto_now_add=True)


class ToolCall(models.Model):
    session = models.ForeignKey(Session, related_name="tool_calls", on_delete=models.CASCADE)
    name = models.CharField(max_length=64)
    input = models.JSONField(default=dict)
    output = models.JSONField(default=dict)
    status = models.CharField(max_length=16, default="ok")
    created = models.DateTimeField(auto_now_add=True)


class PendingAction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(Session, related_name="pending_actions", on_delete=models.CASCADE)
    agent_key = models.CharField(max_length=16)
    name = models.CharField(max_length=64)
    args = models.JSONField(default=dict)
    summary = models.CharField(max_length=300)
    state = models.CharField(max_length=16, default="pending")  # pending | committed
    created = models.DateTimeField(auto_now_add=True)


class Step(models.Model):
    """Persisted streamed step, replayed over SSE. Payloads carry redacted text only."""
    session = models.ForeignKey(Session, related_name="steps", on_delete=models.CASCADE)
    idx = models.IntegerField()
    type = models.CharField(max_length=16)
    payload = models.JSONField(default=dict)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["idx"]


class AuditLog(models.Model):
    session = models.ForeignKey(Session, null=True, on_delete=models.SET_NULL)
    event_type = models.CharField(max_length=32)
    ref = models.CharField(max_length=128, blank=True)
    payload_redacted = models.JSONField(default=dict)
    created = models.DateTimeField(auto_now_add=True)


class RehydrationEntry(models.Model):
    """Token -> raw value map. In production this table is encrypted at rest (KMS) and
    access-controlled separately from Message/AuditLog. Only populated when a real EHR
    write needs true values."""
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    token = models.CharField(max_length=32)
    value = models.TextField()
