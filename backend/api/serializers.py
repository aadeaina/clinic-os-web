"""Lightweight serializers. The API views hand-build response dicts for clarity, so these
are provided for teams that prefer DRF serializer classes when extending the API."""
from rest_framework import serializers
from core.models import Session, Message


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["role", "text_redacted", "created"]


class SessionSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Session
        fields = ["id", "channel", "status", "contained", "created", "messages"]
