from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .services import (
    RouteService, TelemetryService, TicketingService,
    AdminFleetService, AdminShiftService, AdminRevenueService, AdminIncidentService,
    AdminRouteManagementService, FareControlService,
    PublicAuthService, PublicTransitService,
)
from .serializers import (
    HeartbeatSerializer, TicketIssueSerializer, ConductorAuthSerializer,
    ShiftCreateSerializer, IncidentCreateSerializer,
    BatchTicketSyncSerializer, FareControlSerializer,
    OtpRequestSerializer, OtpVerifySerializer,
    RouteSearchQuerySerializer, StopSearchQuerySerializer,
    LiveBusQuerySerializer, EtaQuerySerializer,
    RouteListResponseSerializer, RouteDetailResponseSerializer,
    StopListResponseSerializer, LiveBusListResponseSerializer,
    EtaResponseSerializer,
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


class AdminRouteDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def put(self, request, route_id):
        """PUT /api/v1/admin/routes/<route_id>/ — Update route details, stops, and fare rules"""
        result = AdminRouteManagementService.update_route(route_id, request.data)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)

    def delete(self, request, route_id):
        """DELETE /api/v1/admin/routes/<route_id>/ — Delete route if no active shift operates on it"""
        result = AdminRouteManagementService.delete_route(route_id)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)


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


class AdminStopDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def put(self, request, stop_id):
        """PUT /api/v1/admin/stops/<stop_id>/ — Update stop name or coordinates"""
        data = request.data.copy()
        data['stop_id'] = stop_id
        result = AdminRouteManagementService.create_stop(data)
        if result.get("status") == "error":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        return Response(result, status=status.HTTP_200_OK)


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


# ============================================================
# STAGE 4 — Public Commuter Platform (Swaym Yatri) Views
# ============================================================

class PublicAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfTokenView(PublicAPIView):
    def get(self, request):
        return Response({"csrf_token": get_token(request)})


@method_decorator(csrf_protect, name="dispatch")
class OtpRequestView(PublicAPIView):
    def post(self, request):
        query = OtpRequestSerializer(data=request.data)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result, response_status = PublicAuthService.issue_console_otp(
            query.validated_data["phone_number"],
            request.META.get("REMOTE_ADDR", ""),
        )
        return Response(result, status=response_status)


@method_decorator(csrf_protect, name="dispatch")
class OtpVerifyView(PublicAPIView):
    def post(self, request):
        query = OtpVerifySerializer(data=request.data)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result, response_status = PublicAuthService.verify_console_otp(
            query.validated_data["phone_number"],
            query.validated_data["code"],
        )
        if response_status != status.HTTP_200_OK:
            return Response(result, status=response_status)

        request.session.flush()
        request.session["console_otp_phone_digest"] = result["phone_digest"]
        request.session.set_expiry(settings.SESSION_COOKIE_AGE)
        return Response(
            {
                "authenticated": True,
                "expires_in": settings.SESSION_COOKIE_AGE,
                "delivery_mode": "console",
            }
        )


class AuthSessionView(PublicAPIView):
    def get(self, request):
        authenticated = (
            settings.DEBUG
            and bool(request.session.get("console_otp_phone_digest"))
        )
        return Response(
            {
                "authenticated": authenticated,
                "expires_in": request.session.get_expiry_age() if authenticated else 0,
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class LogoutView(PublicAPIView):
    def post(self, request):
        request.session.flush()
        return Response({"authenticated": False})


class PublicRouteListView(PublicAPIView):
    def get(self, request):
        query = RouteSearchQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result = PublicTransitService.list_routes(query.validated_data)
        return Response(RouteListResponseSerializer(result).data)


class PublicRouteDetailView(PublicAPIView):
    def get(self, request, route_id):
        result = PublicTransitService.get_route_detail(route_id)
        if result is None:
            return Response({"detail": "Route not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(RouteDetailResponseSerializer(result).data)


class PublicStopListView(PublicAPIView):
    def get(self, request):
        query = StopSearchQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result = PublicTransitService.list_stops(query.validated_data.get("q"))
        return Response(StopListResponseSerializer(result).data)


class PublicLiveBusListView(PublicAPIView):
    def get(self, request):
        query = LiveBusQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result = PublicTransitService.list_live_buses(
            query.validated_data.get("route_id"),
            query.validated_data.get("destination_stop_id"),
        )
        return Response(LiveBusListResponseSerializer(result).data)


class PublicBusEtaView(PublicAPIView):
    def get(self, request, bus_id):
        query = EtaQuerySerializer(data=request.query_params)
        if not query.is_valid():
            return Response(query.errors, status=status.HTTP_400_BAD_REQUEST)
        result, response_status = PublicTransitService.get_bus_eta(
            bus_id,
            query.validated_data["stop_id"],
        )
        if response_status != status.HTTP_200_OK:
            return Response(result, status=response_status)
        return Response(EtaResponseSerializer(result).data, status=response_status)

