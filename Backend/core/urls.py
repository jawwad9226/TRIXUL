from django.contrib import admin
from django.urls import path
from .views import RouteInitializationView, TelemetryHeartbeatView, TicketIssueView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/routes/<str:route_id>/', RouteInitializationView.as_view(), name='route_initialization'),
    path('api/v1/telemetry/heartbeat/', TelemetryHeartbeatView.as_view(), name='telemetry_heartbeat'),
    path('api/v1/ticketing/issue/', TicketIssueView.as_view(), name='ticket_issue'),
]
