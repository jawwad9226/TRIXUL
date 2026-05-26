from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services import RouteService, TelemetryService, TicketingService
from .serializers import HeartbeatSerializer, TicketIssueSerializer

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
