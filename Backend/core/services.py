import uuid
from decimal import Decimal
from django.contrib.gis.geos import Point
from .models import Route, RouteStop, FareRule, Stop, Shift, BusLocation, Ticket

class RouteService:
    @staticmethod
    def get_route_initialization_data(route_id):
        try:
            route = Route.objects.get(route_id=route_id)
        except Route.DoesNotExist:
            return None

        # Get stops ordered by sequence
        route_stops = RouteStop.objects.filter(route=route).select_related('stop').order_by('sequence')
        
        stops_data = []
        for rs in route_stops:
            stop = rs.stop
            stops_data.append({
                "stop_id": stop.stop_id,
                "index": rs.sequence,
                "name": stop.stop_name,
                "latitude": stop.gps_location.y if stop.gps_location else None,
                "longitude": stop.gps_location.x if stop.gps_location else None
            })

        # Calculate fares between all pairs of stops based on FareRule
        # Simplified assumption for MVP: Base fare + (distance difference * per_km_rate)
        # Using route_stops to calculate distance.
        fares_data = []
        try:
            fare_rule = FareRule.objects.get(route=route)
            base_fare = fare_rule.base_fare
            per_km_rate = fare_rule.per_km_rate
        except FareRule.DoesNotExist:
            base_fare = Decimal('0.00')
            per_km_rate = Decimal('0.00')

        n = len(route_stops)
        for i in range(n):
            for j in range(i + 1, n):
                rs_from = route_stops[i]
                rs_to = route_stops[j]
                
                # Assuming distance_km is cumulative distance from start, or we can just compute it.
                # Let's assume distance_km on RouteStop is the distance from the START of the route.
                distance_diff = abs(Decimal(str(rs_to.distance_km)) - Decimal(str(rs_from.distance_km)))
                
                price = base_fare + (distance_diff * per_km_rate)
                
                fares_data.append({
                    "from": rs_from.stop.stop_name,
                    "to": rs_to.stop.stop_name,
                    "price": float(price.quantize(Decimal('0.00')))
                })

        return {
            "route_id": route.route_id,
            "route_name": route.route_name,
            "stops": stops_data,
            "fares": fares_data
        }

class TelemetryService:
    @staticmethod
    def process_heartbeat(data):
        shift_id = data['shift_id']
        latitude = data['latitude']
        longitude = data['longitude']
        speed = data['speed']
        timestamp = data['timestamp']

        try:
            shift = Shift.objects.get(shift_id=shift_id)
        except Shift.DoesNotExist:
            return {"status": "error", "message": "Shift not found"}

        current_location = Point(longitude, latitude, srid=4326)

        # Save Telemetry
        BusLocation.objects.create(
            shift=shift,
            current_location=current_location,
            speed=speed,
            timestamp=timestamp
        )

        # Basic ETA and Stop Calculation (Mocked/Simplified for MVP)
        # In a real scenario, this would use PostGIS queries to find nearest stops on the route
        # and calculate ETA based on distance / speed.
        
        # Example nearest stop logic using GeoDjango distance:
        # nearest_stop = Stop.objects.filter(routestop__route=shift.route).annotate(
        #     distance=Distance('gps_location', current_location)
        # ).order_by('distance').first()

        return {
            "status": "success",
            "current_stop": "Jalgaon", # Placeholder for actual calculation
            "next_stop": "Kherda",     # Placeholder for actual calculation
            "eta_minutes": 12,         # Placeholder for actual calculation
            "condition": "Moving" if speed > 0 else "Stopped"
        }

class TicketingService:
    @staticmethod
    def issue_ticket(data):
        shift_id = data['shift_id']
        source_stop_id = data['source_stop_id']
        dest_stop_id = data['dest_stop_id']
        passenger_count = data['passenger_count']
        total_fare = data['total_fare']
        timestamp = data['timestamp']

        try:
            shift = Shift.objects.get(shift_id=shift_id)
            source_stop = Stop.objects.get(stop_id=source_stop_id)
            dest_stop = Stop.objects.get(stop_id=dest_stop_id)
        except (Shift.DoesNotExist, Stop.DoesNotExist):
            return {"status": "error", "message": "Invalid shift or stop ID"}

        # Generate unique ticket ID
        ticket_id = f"TKT-{shift.route.route_id.split('-')[-1]}-{str(uuid.uuid4().int)[:4]}"

        Ticket.objects.create(
            ticket_id=ticket_id,
            shift=shift,
            source_stop=source_stop,
            dest_stop=dest_stop,
            passenger_count=passenger_count,
            total_fare=total_fare,
            timestamp=timestamp
        )

        return {
            "status": "success",
            "ticket_id": ticket_id,
            "message": "Ticket logged securely."
        }
