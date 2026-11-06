from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import (
    RouteService, TelemetryService, TicketingService,
    AdminFleetService, AdminShiftService, AdminRevenueService, AdminIncidentService
)
from .serializers import (
    HeartbeatSerializer, TicketIssueSerializer, ConductorAuthSerializer,
    ShiftCreateSerializer, IncidentCreateSerializer
)

class ConductorLoginView(APIView):
    # THIS IS THE MAGIC FIX FOR THE 401 ERROR:
    authentication_classes = [] 
    permission_classes = []

    def post(self, request):
        serializer = ConductorAuthSerializer(data=request.data)
        if serializer.is_valid():
            # The serializer is now handling the token logic, we just return the data
            return Response(serializer.validated_data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)

class RouteInitializationView(APIView):
    def get(self, request, route_id):
        data = RouteService.get_route_initialization_data(route_id)
        if not data:
            return Response({"error": "Route not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(data, status=status.HTTP_200_OK)

class TelemetryHeartbeatView(APIView):
    def post(self, request):
        serializer = HeartbeatSerializer(data=request.data)
        if serializer.is_valid():
            result = TelemetryService.process_heartbeat(serializer.validated_data)
            if result.get("status") == "error":
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TicketIssueView(APIView):
    def post(self, request):
        serializer = TicketIssueSerializer(data=request.data)
        if serializer.is_valid():
            result = TicketingService.issue_ticket(serializer.validated_data)
            if result.get("status") == "error":
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================================
# STAGE 3 — Admin Command Center Views
# All are open (authentication_classes=[]) for dev; lock down in prod.
# ============================================================

class AdminFleetView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """GET /api/v1/admin/fleet/ — All active buses with live GPS + stats"""
        return Response(AdminFleetService.get_fleet_status(), status=status.HTTP_200_OK)


class AdminDispatchOptionsView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """GET /api/v1/admin/dispatch-options/ — Conductors, Buses, Routes for dispatch"""
        return Response(AdminShiftService.get_dispatch_options(), status=status.HTTP_200_OK)


class AdminShiftView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """GET /api/v1/admin/shifts/ — List all shifts"""
        return Response(AdminShiftService.list_shifts(), status=status.HTTP_200_OK)

    def post(self, request):
        """POST /api/v1/admin/shifts/ — Create a new shift (assign conductor + bus + route)"""
        serializer = ShiftCreateSerializer(data=request.data)
        if serializer.is_valid():
            result = AdminShiftService.create_shift(serializer.validated_data)
            if result.get("status") == "error":
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminShiftCloseView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, shift_id):
        """POST /api/v1/admin/shifts/<shift_id>/close/ — Close an active shift"""
        result = AdminShiftService.close_shift(shift_id)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)


class AdminRevenueView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """GET /api/v1/admin/revenue/ — Revenue summary (cash/UPI split, per route, per conductor)"""
        return Response(AdminRevenueService.get_summary(), status=status.HTTP_200_OK)


class AdminIncidentView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """GET /api/v1/admin/incidents/ — All incidents, newest first"""
        return Response(AdminIncidentService.list_incidents(), status=status.HTTP_200_OK)

    def post(self, request):
        """POST /api/v1/admin/incidents/ — ETM raises an SOS or warning"""
        serializer = IncidentCreateSerializer(data=request.data)
        if serializer.is_valid():
            result = AdminIncidentService.create_incident(serializer.validated_data)
            if result.get("status") == "error":
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
