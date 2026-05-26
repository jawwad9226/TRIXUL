import uuid
from decimal import Decimal
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.db.models import F
from django.core.cache import cache
import threading
from django.db import close_old_connections
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

        # Calculate fares between all pairs of stops
        fares_data = []
        try:
            fare_rule = FareRule.objects.get(route=route)
            base_fare = fare_rule.base_fare
            per_km_rate = fare_rule.per_km_rate
        except FareRule.DoesNotExist:
            base_fare = Decimal('0.00')
            per_km_rate = Decimal('0.00')

        route_stops_list = list(route_stops)
        n = len(route_stops_list)
        for i in range(n):
            for j in range(i + 1, n):
                rs_from = route_stops_list[i]
                rs_to = route_stops_list[j]
                
                distance_diff = abs(Decimal(str(rs_to.distance_km)) - Decimal(str(rs_from.distance_km)))
                price = base_fare + (distance_diff * per_km_rate)
                
                fares_data.append({
                    "from": rs_from.stop.stop_id,
                    "to": rs_to.stop.stop_id,
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

        def save_location_async():
            close_old_connections()
            try:
                BusLocation.objects.create(
                    shift=shift,
                    current_location=current_location,
                    speed=speed,
                    timestamp=timestamp
                )
            finally:
                close_old_connections()

        # Cache the latest telemetry in Redis for instant frontend retrieval
        cache_key = f"bus_location_latest_{shift_id}"
        cache_data = {
            "latitude": latitude,
            "longitude": longitude,
            "speed": speed,
            "timestamp": timestamp.isoformat() if hasattr(timestamp, 'isoformat') else timestamp
        }
        
        try:
            cache.set(cache_key, cache_data, timeout=60)
            # Async save to PostgreSQL to prevent write-locking
            threading.Thread(target=save_location_async).start()
        except Exception as e:
            import logging
            logging.error(f"Redis cache failed: {e}")
            # Fallback: write directly to DB synchronously
            BusLocation.objects.create(
                shift=shift,
                current_location=current_location,
                speed=speed,
                timestamp=timestamp
            )

        # Native PostGIS distance calculation to find the nearest stop
        # Distance gets annotated in meters natively depending on the SRID, but for Geography it's meters
        # Assuming SRID 4326 geometry, Distance might be in degrees, but for MVP it serves to order.
        # To get real meters, casting to geography can be used, but let's stick to Distance function.
        nearest_rs = RouteStop.objects.filter(route=shift.route).annotate(
            dist=Distance('stop__gps_location', current_location)
        ).order_by('dist').first()

        if not nearest_rs:
            return {
                "status": "success",
                "current_stop": "Unknown",
                "next_stop": "Unknown",
                "eta_minutes": 0,
                "condition": "Stationary"
            }

        current_stop_name = nearest_rs.stop.stop_name
        
        # Find next stop
        next_rs = RouteStop.objects.filter(
            route=shift.route,
            sequence__gt=nearest_rs.sequence
        ).order_by('sequence').first()

        if not next_rs:
            return {
                "status": "success",
                "current_stop": current_stop_name,
                "next_stop": "End of Route",
                "eta_minutes": 0,
                "condition": "Stationary" if speed == 0 else "Moving"
            }

        next_stop_name = next_rs.stop.stop_name

        # Calculate ETA based on distance and speed
        # Simple math: distance between nearest and next stop (km) / speed (km/h)
        # distance = next_rs.distance_km - nearest_rs.distance_km
        distance_km = abs(next_rs.distance_km - nearest_rs.distance_km)
        
        if speed > 0:
            eta_hours = distance_km / speed
            eta_minutes = int(eta_hours * 60)
        else:
            eta_minutes = 999 # Stopped, arbitrary large number or 0

        condition = "Moving" if speed > 0 else "Stationary"

        return {
            "status": "success",
            "current_stop": current_stop_name,
            "next_stop": next_stop_name,
            "eta_minutes": eta_minutes,
            "condition": condition
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
        ticket_id = f"TKT-{shift.route.route_id.split('-')[-1]}-{str(uuid.uuid4().int)[:6]}"

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
