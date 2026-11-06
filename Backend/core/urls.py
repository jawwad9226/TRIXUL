from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RouteInitializationView, TelemetryHeartbeatView, TicketIssueView, ConductorLoginView,
    AdminFleetView, AdminShiftView, AdminShiftCloseView, AdminRevenueView, AdminIncidentView,
    AdminDispatchOptionsView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── ETM (Stage 1 & 2) ──────────────────────────────────────────────────────
    path('api/v1/auth/login/', ConductorLoginView.as_view(), name='conductor_login'),
    path('api/v1/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/routes/<str:route_id>/', RouteInitializationView.as_view(), name='route_init'),
    path('api/v1/telemetry/heartbeat/', TelemetryHeartbeatView.as_view(), name='telemetry_heartbeat'),
    path('api/v1/ticketing/issue/', TicketIssueView.as_view(), name='ticket_issue'),

    # ── Admin Command Center (Stage 3) ─────────────────────────────────────────
    path('api/v1/admin/fleet/', AdminFleetView.as_view(), name='admin_fleet'),
    path('api/v1/admin/dispatch-options/', AdminDispatchOptionsView.as_view(), name='admin_dispatch_options'),
    path('api/v1/admin/shifts/', AdminShiftView.as_view(), name='admin_shifts'),
    path('api/v1/admin/shifts/<str:shift_id>/close/', AdminShiftCloseView.as_view(), name='admin_shift_close'),
    path('api/v1/admin/revenue/', AdminRevenueView.as_view(), name='admin_revenue'),
    path('api/v1/admin/incidents/', AdminIncidentView.as_view(), name='admin_incidents'),
]
