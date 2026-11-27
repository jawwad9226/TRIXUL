from django.conf import settings
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import auth_services, services
from .serializers import (
    EtaQuerySerializer,
    EtaResponseSerializer,
    LiveBusListResponseSerializer,
    LiveBusQuerySerializer,
    OtpRequestSerializer,
    OtpVerifySerializer,
    RouteDetailResponseSerializer,
    RouteListResponseSerializer,
    RouteSearchQuerySerializer,
    StopListResponseSerializer,
    StopSearchQuerySerializer,
)


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
        result, response_status = auth_services.issue_console_otp(
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
        result, response_status = auth_services.verify_console_otp(
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
