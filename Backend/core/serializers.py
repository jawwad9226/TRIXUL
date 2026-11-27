from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Employee, Route, Stop, RouteStop, Shift

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

        # Fetch active shift if one exists for this conductor
        active_shift = Shift.objects.filter(emp=employee, status='Active').select_related('bus', 'route').first()
        shift_info = None
        if active_shift:
            shift_info = {
                'shift_id': active_shift.shift_id,
                'bus_id': active_shift.bus.bus_id,
                'bus_number': active_shift.bus.registration_number,
                'route_id': active_shift.route.route_id,
                'route_name': active_shift.route.route_name
            }

        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'employee': {
                'id': employee.emp_id,
                'emp_id': employee.emp_id,
                'name': employee.name,
                'role': employee.role
            },
            'shift': shift_info
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


class ShiftCreateSerializer(serializers.Serializer):
    emp_id = serializers.CharField(max_length=50)
    bus_id = serializers.CharField(max_length=50)
    route_id = serializers.CharField(max_length=50)


class IncidentCreateSerializer(serializers.Serializer):
    shift_id = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    severity = serializers.ChoiceField(choices=['SOS', 'WARNING', 'INFO'], default='SOS')
    message = serializers.CharField()
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)


class BatchTicketItemSerializer(serializers.Serializer):
    ticket_id = serializers.CharField(max_length=50, required=False)
    source_stop_id = serializers.CharField(max_length=50)
    dest_stop_id = serializers.CharField(max_length=50)
    passenger_count = serializers.IntegerField(default=1)
    total_fare = serializers.DecimalField(max_digits=10, decimal_places=2)
    payment_method = serializers.CharField(max_length=50, required=False, default='CASH')
    timestamp = serializers.DateTimeField()


class BatchTicketSyncSerializer(serializers.Serializer):
    shift_id = serializers.CharField(max_length=50)
    tickets = BatchTicketItemSerializer(many=True)


class FareControlSerializer(serializers.Serializer):
    route_id = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    base_fare = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    per_km_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)


# ── Public Commuter Platform (Swaym Yatri) Serializers ──────────────────────

class OtpRequestSerializer(serializers.Serializer):
    phone_number = serializers.RegexField(
        regex=r"^\+[1-9]\d{7,14}$",
        max_length=16,
        error_messages={"invalid": "Enter a phone number in international format, such as +919876543210."},
    )


class OtpVerifySerializer(OtpRequestSerializer):
    code = serializers.RegexField(regex=r"^\d{6}$", max_length=6)


class RouteSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=False, max_length=100)
    origin_stop_id = serializers.CharField(required=False, max_length=50)
    destination_stop_id = serializers.CharField(required=False, max_length=50)

    def validate(self, attrs):
        if bool(attrs.get("origin_stop_id")) != bool(attrs.get("destination_stop_id")):
            raise serializers.ValidationError(
                "origin_stop_id and destination_stop_id must be provided together."
            )
        return attrs


class StopSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=False, max_length=100)


class LiveBusQuerySerializer(serializers.Serializer):
    route_id = serializers.CharField(required=False, max_length=50)
    destination_stop_id = serializers.CharField(required=False, max_length=50)


class EtaQuerySerializer(serializers.Serializer):
    stop_id = serializers.CharField(max_length=50)


class RouteSummarySerializer(serializers.Serializer):
    route_id = serializers.CharField()
    route_name = serializers.CharField()
    origin_stop_id = serializers.CharField(allow_null=True)
    destination_stop_id = serializers.CharField(allow_null=True)
    stop_count = serializers.IntegerField()
    active_bus_count = serializers.IntegerField()


class RouteListResponseSerializer(serializers.Serializer):
    data_source = serializers.ChoiceField(choices=["demo", "live"])
    routes = RouteSummarySerializer(many=True)


class StopSerializer(serializers.Serializer):
    stop_id = serializers.CharField()
    stop_name = serializers.CharField()
    latitude = serializers.FloatField(allow_null=True)
    longitude = serializers.FloatField(allow_null=True)


class StopListResponseSerializer(serializers.Serializer):
    data_source = serializers.ChoiceField(choices=["demo", "live"])
    stops = StopSerializer(many=True)


class RouteStopSerializer(StopSerializer):
    sequence = serializers.IntegerField()
    distance_km = serializers.FloatField()


class PublicFareRuleSerializer(serializers.Serializer):
    base_fare = serializers.DecimalField(max_digits=10, decimal_places=2)
    per_km_rate = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class PublicFareSerializer(serializers.Serializer):
    from_stop_id = serializers.CharField()
    to_stop_id = serializers.CharField()
    fare = serializers.DecimalField(max_digits=10, decimal_places=2)


class RouteDetailResponseSerializer(serializers.Serializer):
    data_source = serializers.ChoiceField(choices=["demo", "live"])
    route_id = serializers.CharField()
    route_name = serializers.CharField()
    route_stops = RouteStopSerializer(many=True)
    fare_rule = PublicFareRuleSerializer(allow_null=True)
    fares = PublicFareSerializer(many=True)


class LiveBusSerializer(serializers.Serializer):
    bus_id = serializers.CharField()
    bus_registration = serializers.CharField()
    route_id = serializers.CharField()
    current_stop_id = serializers.CharField(allow_null=True)
    current_stop_name = serializers.CharField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    speed_kmh = serializers.FloatField()
    last_updated_at = serializers.DateTimeField()
    is_stale = serializers.BooleanField()
    data_source = serializers.ChoiceField(choices=["demo", "live"])
    passenger_count = serializers.IntegerField(default=0)
    capacity_total = serializers.IntegerField(default=56)
    crowdedness_level = serializers.ChoiceField(choices=["green", "yellow", "red"], default="green")
    crowdedness_label = serializers.CharField(default="Seats Available")


class LiveBusListResponseSerializer(serializers.Serializer):
    data_source = serializers.ChoiceField(choices=["demo", "live"])
    buses = LiveBusSerializer(many=True)


class EtaResponseSerializer(serializers.Serializer):
    bus_id = serializers.CharField()
    stop_id = serializers.CharField()
    distance_km = serializers.FloatField(allow_null=True)
    eta_minutes = serializers.IntegerField(allow_null=True)
    speed_kmh = serializers.FloatField(allow_null=True)
    last_updated_at = serializers.DateTimeField(allow_null=True)
    is_stale = serializers.BooleanField()
    data_source = serializers.ChoiceField(choices=["demo", "live", "unavailable"])

