from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import (
    RouteService, TelemetryService, TicketingService,
    AdminFleetService, AdminShiftService, AdminRevenueService, AdminIncidentService,
    AdminRouteManagementService, FareControlService,
)
from .serializers import (
    HeartbeatSerializer, TicketIssueSerializer, ConductorAuthSerializer,
    ShiftCreateSerializer, IncidentCreateSerializer,
    BatchTicketSyncSerializer, FareControlSerializer,
)

from rest_framework_simplejwt.views import TokenViewBase
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import serializers

class CustomTokenRefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()
    access = serializers.CharField(read_only=True)

    def validate(self, attrs):
        try:
            refresh = RefreshToken(attrs['refresh'])
            data = {'access': str(refresh.access_token)}
            return data
        except Exception as e:
            raise serializers.ValidationError(str(e))


class CustomTokenRefreshView(TokenViewBase):
    authentication_classes = []
    permission_classes = []
    serializer_class = CustomTokenRefreshSerializer


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


class BatchTicketSyncView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        """POST /api/v1/sync/batch/ — Stage 1 & 2 Batch Ingestion for offline ETM sync"""
        serializer = BatchTicketSyncSerializer(data=request.data)
        if serializer.is_valid():
            result = TicketingService.batch_issue_tickets(serializer.validated_data)
            if result.get("status") == "error":
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ShiftTicketSummaryView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, shift_id):
        """GET /api/v1/ticketing/shift/<shift_id>/summary/ — Live shift tickets & cash/UPI reconciliation"""
        result = TicketingService.get_shift_ticket_summary(shift_id)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_404_NOT_FOUND)
        return Response(result, status=status.HTTP_200_OK)



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


class AdminIncidentAcknowledgeView(APIView):
    authentication_classes = []
    permission_classes = []

    def patch(self, request, incident_id):
        """PATCH /api/v1/admin/incidents/<incident_id>/acknowledge/ — Acknowledge an incident"""
        result = AdminIncidentService.acknowledge_incident(incident_id)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)


class AdminShiftReassignBusView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, shift_id):
        """POST /api/v1/admin/shifts/<shift_id>/reassign-bus/ — Mid-shift bus swap"""
        new_bus_id = request.data.get('new_bus_id') or request.data.get('bus_id')
        if not new_bus_id:
            return Response({"status": "error", "message": "new_bus_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        result = AdminShiftService.reassign_bus(shift_id, new_bus_id)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)



class AdminRouteListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """GET /api/v1/admin/routes/ — All routes with stops and fare rules"""
        return Response(AdminRouteManagementService.list_routes(), status=status.HTTP_200_OK)


class AdminRouteCreateView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        """POST /api/v1/admin/routes/ — Create a new route with stops and fare rule"""
        required = ['route_id', 'route_name', 'stops']
        for field in required:
            if not request.data.get(field):
                return Response({"status": "error", "message": f"'{field}' is required."}, status=status.HTTP_400_BAD_REQUEST)
        result = AdminRouteManagementService.create_route(request.data)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_201_CREATED)


class AdminStopListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """GET /api/v1/admin/stops/ — All registered GPS stops"""
        return Response(AdminRouteManagementService.list_stops(), status=status.HTTP_200_OK)

    def post(self, request):
        """POST /api/v1/admin/stops/ — Register new stop from visual map click"""
        stop_name = request.data.get('stop_name')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        if not stop_name or latitude is None or longitude is None:
            return Response(
                {"status": "error", "message": "stop_name, latitude, and longitude are required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        result = AdminRouteManagementService.create_stop(request.data)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_201_CREATED)


class AdminFareControlView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        """GET /api/v1/admin/fare-controls/ — List all dynamic fare controls & discounts"""
        return Response(FareControlService.get_fare_controls(), status=status.HTTP_200_OK)

    def post(self, request):
        """POST /api/v1/admin/fare-controls/ — Update midday discount or fare rates across routes"""
        serializer = FareControlSerializer(data=request.data)
        if serializer.is_valid():
            result = FareControlService.update_fare_control(serializer.validated_data)
            return Response(result, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

