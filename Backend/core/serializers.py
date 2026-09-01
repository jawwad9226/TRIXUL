from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Employee, Route, Stop, RouteStop

class ConductorAuthSerializer(serializers.Serializer):
    # Accept multiple possible key names just in case the frontend sends something different
    emp_id = serializers.CharField(required=False)
    employee_id = serializers.CharField(required=False)
    username = serializers.CharField(required=False)

    def validate(self, attrs):
        # Extract whichever ID the frontend actually sent
        supplied_id = attrs.get('emp_id') or attrs.get('employee_id') or attrs.get('username')
        
        try:
            employee = Employee.objects.get(emp_id=supplied_id)
        except Employee.DoesNotExist:
            raise serializers.ValidationError("Invalid Employee ID")

        # Generate standard JWT tokens
        refresh = RefreshToken.for_user(employee)
        refresh['user_id'] = employee.emp_id  # Force the token to use emp_id

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'employee': {
                'id': employee.emp_id,
                'name': employee.name,
                'role': employee.role
            }
        }


class HeartbeatSerializer(serializers.Serializer):
    shift_id = serializers.CharField(max_length=50)
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    speed = serializers.FloatField()
    timestamp = serializers.DateTimeField()


class TicketIssueSerializer(serializers.Serializer):
    shift_id = serializers.CharField(max_length=50)
    source_stop_id = serializers.CharField(max_length=50)
    dest_stop_id = serializers.CharField(max_length=50)
    passenger_count = serializers.IntegerField()
    total_fare = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.CharField(max_length=50, required=False)
    timestamp = serializers.DateTimeField()