from rest_framework import serializers


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
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()


class StopListResponseSerializer(serializers.Serializer):
    data_source = serializers.ChoiceField(choices=["demo", "live"])
    stops = StopSerializer(many=True)


class RouteStopSerializer(StopSerializer):
    sequence = serializers.IntegerField()
    distance_km = serializers.FloatField()


class FareRuleSerializer(serializers.Serializer):
    base_fare = serializers.DecimalField(max_digits=10, decimal_places=2)
    per_km_rate = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)


class FareSerializer(serializers.Serializer):
    from_stop_id = serializers.CharField()
    to_stop_id = serializers.CharField()
    fare = serializers.DecimalField(max_digits=10, decimal_places=2)


class RouteDetailResponseSerializer(serializers.Serializer):
    data_source = serializers.ChoiceField(choices=["demo", "live"])
    route_id = serializers.CharField()
    route_name = serializers.CharField()
    route_stops = RouteStopSerializer(many=True)
    fare_rule = FareRuleSerializer(allow_null=True)
    fares = FareSerializer(many=True)


class LiveBusSerializer(serializers.Serializer):
    bus_id = serializers.CharField()
    bus_registration = serializers.CharField()
    route_id = serializers.CharField()
    current_stop_id = serializers.CharField()
    current_stop_name = serializers.CharField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    speed_kmh = serializers.FloatField()
    last_updated_at = serializers.DateTimeField()
    is_stale = serializers.BooleanField()
    data_source = serializers.ChoiceField(choices=["demo", "live"])


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
