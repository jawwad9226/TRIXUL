from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .serializers import (
    EtaQuerySerializer,
    EtaResponseSerializer,
    LiveBusListResponseSerializer,
    LiveBusQuerySerializer,
    RouteDetailResponseSerializer,
    RouteListResponseSerializer,
    RouteSearchQuerySerializer,
    StopListResponseSerializer,
    StopSearchQuerySerializer,
)


class PublicAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


class PublicRouteListView(PublicAPIView):
    def get(self, request):
        query = RouteSearchQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result = services.list_routes(query.validated_data)
        return Response(RouteListResponseSerializer(result).data)


class PublicRouteDetailView(PublicAPIView):
    def get(self, request, route_id):
        result = services.get_route_detail(route_id)
        if result is None:
            return Response({"detail": "Route not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RouteDetailResponseSerializer(result).data)


class PublicStopListView(PublicAPIView):
    def get(self, request):
        query = StopSearchQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result = services.list_stops(query.validated_data.get("q"))
        return Response(StopListResponseSerializer(result).data)


class PublicLiveBusListView(PublicAPIView):
    def get(self, request):
        query = LiveBusQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result = services.list_live_buses(
            query.validated_data.get("route_id"),
            query.validated_data.get("destination_stop_id"),
        )
        return Response(LiveBusListResponseSerializer(result).data)


class PublicBusEtaView(PublicAPIView):
    def get(self, request, bus_id):
        query = EtaQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result, response_status = services.get_bus_eta(
            bus_id,
            query.validated_data["stop_id"],
        )
        if response_status != status.HTTP_200_OK:
            return Response(result, status=response_status)
        return Response(EtaResponseSerializer(result).data, status=response_status)
