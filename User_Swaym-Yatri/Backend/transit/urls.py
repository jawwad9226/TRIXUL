from django.urls import path

from .views import (
    AuthSessionView,
    CsrfTokenView,
    LogoutView,
    OtpRequestView,
    OtpVerifyView,
    PublicBusEtaView,
    PublicLiveBusListView,
    PublicRouteDetailView,
    PublicRouteListView,
    PublicStopListView,
)

urlpatterns = [
    path("auth/csrf/", CsrfTokenView.as_view(), name="public_auth_csrf"),
    path("auth/otp/request/", OtpRequestView.as_view(), name="public_auth_otp_request"),
    path("auth/otp/verify/", OtpVerifyView.as_view(), name="public_auth_otp_verify"),
    path("auth/session/", AuthSessionView.as_view(), name="public_auth_session"),
    path("auth/logout/", LogoutView.as_view(), name="public_auth_logout"),
    path("routes/", PublicRouteListView.as_view(), name="public_routes"),
    path("routes/<str:route_id>/", PublicRouteDetailView.as_view(), name="public_route_detail"),
    path("stops/", PublicStopListView.as_view(), name="public_stops"),
    path("buses/live/", PublicLiveBusListView.as_view(), name="public_live_buses"),
    path("buses/<str:bus_id>/eta/", PublicBusEtaView.as_view(), name="public_bus_eta"),
]
