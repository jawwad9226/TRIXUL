from rest_framework import serializers

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

class LoginSerializer(serializers.Serializer):
    emp_id = serializers.CharField(max_length=50)
    password = serializers.CharField(max_length=128, required=False) # Not strictly required for MVP mock unless requested, but good to have

