from django.urls import path
from . import views

urlpatterns = [
    path("events", views.events),
    path("sessions", views.sessions),
    path("sessions/<uuid:session_id>", views.session_detail),
    path("sessions/<uuid:session_id>/stream", views.stream),
    path("sessions/<uuid:session_id>/confirm", views.confirm),
    path("analytics/summary", views.analytics_summary),
]
