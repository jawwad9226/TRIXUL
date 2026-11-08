from django.contrib import admin
from django.urls import path
from .views import (
    RouteInitializationView, TelemetryHeartbeatView, TicketIssueView, ConductorLoginView,
    CustomTokenRefreshView,
    AdminFleetView, AdminShiftView, AdminShiftCloseView, AdminRevenueView, AdminIncidentView,
    AdminDispatchOptionsView, AdminIncidentAcknowledgeView, AdminShiftReassignBusView,
    AdminRouteListView, AdminRouteCreateView, AdminStopListView,
    BatchTicketSyncView, ShiftTicketSummaryView, AdminFareControlView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── ETM (Stage 1 & 2) ──────────────────────────────────────────────────────
    path('api/v1/auth/login/', ConductorLoginView.as_view(), name='conductor_login'),
    path('api/v1/auth/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/routes/<str:route_id>/', RouteInitializationView.as_view(), name='route_init'),
    path('api/v1/telemetry/heartbeat/', TelemetryHeartbeatView.as_view(), name='telemetry_heartbeat'),
    path('api/v1/ticketing/issue/', TicketIssueView.as_view(), name='ticket_issue'),
    path('api/v1/sync/batch/', BatchTicketSyncView.as_view(), name='batch_ticket_sync'),
    path('api/v1/ticketing/shift/<str:shift_id>/summary/', ShiftTicketSummaryView.as_view(), name='shift_ticket_summary'),

    # ── Admin Command Center (Stage 3) ─────────────────────────────────────────
    path('api/v1/admin/fleet/', AdminFleetView.as_view(), name='admin_fleet'),
    path('api/v1/admin/dispatch-options/', AdminDispatchOptionsView.as_view(), name='admin_dispatch_options'),
    path('api/v1/admin/shifts/', AdminShiftView.as_view(), name='admin_shifts'),
    path('api/v1/admin/shifts/<str:shift_id>/close/', AdminShiftCloseView.as_view(), name='admin_shift_close'),
    path('api/v1/admin/shifts/<str:shift_id>/reassign-bus/', AdminShiftReassignBusView.as_view(), name='admin_shift_reassign_bus'),
    path('api/v1/admin/revenue/', AdminRevenueView.as_view(), name='admin_revenue'),
    path('api/v1/admin/incidents/', AdminIncidentView.as_view(), name='admin_incidents'),
    path('api/v1/admin/incidents/<str:incident_id>/acknowledge/', AdminIncidentAcknowledgeView.as_view(), name='admin_incident_acknowledge'),
    path('api/v1/admin/fare-controls/', AdminFareControlView.as_view(), name='admin_fare_controls'),

    # ── Route & Stop Master Data Management ────────────────────────────────────
    path('api/v1/admin/routes/', AdminRouteListView.as_view(), name='admin_routes_list'),
    path('api/v1/admin/routes/create/', AdminRouteCreateView.as_view(), name='admin_routes_create'),
    path('api/v1/admin/stops/', AdminStopListView.as_view(), name='admin_stops_list'),
]
