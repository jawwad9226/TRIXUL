from django.urls import path
from .views import RouteInitializationView, TelemetryHeartbeatView, TicketIssueView, LoginView

urlpatterns = [
    path('v1/auth/login/', LoginView.as_view(), name='auth_login'),
    path('v1/routes/<str:route_id>/', RouteInitializationView.as_view(), name='route_initialization'),
    path('v1/telemetry/heartbeat/', TelemetryHeartbeatView.as_view(), name='telemetry_heartbeat'),
    path('v1/ticketing/issue/', TicketIssueView.as_view(), name='ticket_issue'),
]
