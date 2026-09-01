from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import RouteInitializationView, TelemetryHeartbeatView, TicketIssueView, ConductorLoginView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Add the api/v1/ prefix so the frontend can find them!
    path('api/v1/auth/login/', ConductorLoginView.as_view(), name='conductor_login'),
    path('api/v1/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # We will also expose the other endpoints the app needs
    path('api/v1/routes/<str:route_id>/', RouteInitializationView.as_view(), name='route_init'),
    path('api/v1/telemetry/heartbeat/', TelemetryHeartbeatView.as_view(), name='telemetry_heartbeat'),
    path('api/v1/ticketing/issue/', TicketIssueView.as_view(), name='ticket_issue'),
]
