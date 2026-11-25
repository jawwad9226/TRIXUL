from django.urls import path

from .views import (
    PublicBusEtaView,
    PublicLiveBusListView,
    PublicRouteDetailView,
    PublicRouteListView,
    PublicStopListView,
)

urlpatterns = [
    path("routes/", PublicRouteListView.as_view(), name="public_routes"),
    path("routes/<str:route_id>/", PublicRouteDetailView.as_view(), name="public_route_detail"),
    path("stops/", PublicStopListView.as_view(), name="public_stops"),
    path("buses/live/", PublicLiveBusListView.as_view(), name="public_live_buses"),
    path("buses/<str:bus_id>/eta/", PublicBusEtaView.as_view(), name="public_bus_eta"),
]
