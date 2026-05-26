from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .services import RouteService, TelemetryService, TicketingService
from .serializers import HeartbeatSerializer, TicketIssueSerializer, LoginSerializer
from .models import Employee
class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            emp_id = serializer.validated_data['emp_id']
            try:
                employee = Employee.objects.get(emp_id=emp_id)
                refresh = RefreshToken.for_user(employee)
                # Ensure the payload uses emp_id
                refresh['user_id'] = employee.emp_id
                
                return Response({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'employee': {
                        'emp_id': employee.emp_id,
                        'name': employee.name,
                        'role': employee.role
                    }
                })
            except Employee.DoesNotExist:
                return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RouteInitializationView(APIView):
    def get(self, request, route_id):
        data = RouteService.get_route_initialization_data(route_id)
        if not data:
            return Response({"error": "Route not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(data, status=status.HTTP_200_OK)

class TelemetryHeartbeatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = HeartbeatSerializer(data=request.data)
        if serializer.is_valid():
            result = TelemetryService.process_heartbeat(serializer.validated_data)
            if result.get("status") == "error":
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class TicketIssueView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TicketIssueSerializer(data=request.data)
        if serializer.is_valid():
            result = TicketingService.issue_ticket(serializer.validated_data)
            if result.get("status") == "error":
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
