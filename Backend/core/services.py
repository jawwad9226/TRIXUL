import uuid
from decimal import Decimal
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from .models import Route, RouteStop, FareRule, Stop, Shift, BusLocation, Ticket

class RouteService:
    @staticmethod
    def get_route_initialization_data(route_id):
        try:
            route = Route.objects.get(route_id=route_id)
        except Route.DoesNotExist:
            return None

        # Fetch active shift and bus details assigned to this route
        active_shift = Shift.objects.filter(route=route, status='Active').select_related('bus', 'emp').first()
        bus_info = {
            "bus_id": active_shift.bus.bus_id if active_shift else "bus-101",
            "bus_number": active_shift.bus.registration_number if active_shift else "MH-30-AB-1234",
            "capacity_total": active_shift.bus.capacity_total if active_shift else 56,
            "shift_id": active_shift.shift_id if active_shift else "shift-001",
            "conductor_id": active_shift.emp.emp_id if active_shift else "cond-1001",
            "conductor_name": active_shift.emp.name if active_shift else "Suresh Patil",
        }

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
        fares_data = []
        try:
            fare_rule = FareRule.objects.get(route=route)
            base_fare = fare_rule.base_fare
            per_km_rate = fare_rule.per_km_rate
        except FareRule.DoesNotExist:
            base_fare = Decimal('10.00')
            per_km_rate = Decimal('1.50')

        n = len(route_stops)
        for i in range(n):
            for j in range(i + 1, n):
                rs_from = route_stops[i]
                rs_to = route_stops[j]
                
                distance_diff = abs(Decimal(str(rs_to.distance_km)) - Decimal(str(rs_from.distance_km)))
                price = base_fare + (distance_diff * per_km_rate)
                
                fares_data.append({
                    "from": rs_from.stop.stop_name,
                    "to": rs_to.stop.stop_name,
                    "from_stop_id": rs_from.stop.stop_id,
                    "to_stop_id": rs_to.stop.stop_id,
                    "price": float(price.quantize(Decimal('0.00')))
                })

        # Government / Admin active schemes
        active_yojnas = {
            "mahilaSanman": True,   # 50% discount for female passengers (Government scheme)
            "seniorCitizen": True,  # Senior citizen concession (75+ free)
            "childConcession": True # 50% half ticket for children (5-12 years)
        }

        return {
            "route_id": route.route_id,
            "route_name": route.route_name,
            "busNumber": bus_info["bus_number"],
            "busId": bus_info["bus_id"],
            "capacity_total": bus_info["capacity_total"],
            "shiftId": bus_info["shift_id"],
            "conductorName": bus_info["conductor_name"],
            "conductorId": bus_info["conductor_id"],
            "stops": stops_data,
            "fares": fares_data,
            "activeYojnas": active_yojnas
        }

class TelemetryService:
    @staticmethod
    def process_heartbeat(data):
        shift_id = data.get('shift_id')
        latitude = data['latitude']
        longitude = data['longitude']
        speed = float(data.get('speed', 0.0))
        timestamp = data['timestamp']

        # Look up requested shift or fall back to any active shift
        shift = Shift.objects.filter(shift_id=shift_id).first()
        if not shift:
            shift = Shift.objects.filter(status='Active').first()
        if not shift:
            return {"status": "error", "message": "No active shift found"}

        current_location = Point(longitude, latitude, srid=4326)

        # Save actual Telemetry to PostgreSQL
        BusLocation.objects.create(
            shift=shift,
            current_location=current_location,
            speed=speed,
            timestamp=timestamp
        )

        # Real PostGIS calculation: Find stops on route ordered by distance
        route_stops = list(
            RouteStop.objects.filter(route=shift.route)
            .select_related('stop')
            .annotate(dist=Distance('stop__gps_location', current_location))
            .order_by('sequence')
        )

        if route_stops:
            closest_rs = min(route_stops, key=lambda rs: rs.dist.m)
            current_stop_name = closest_rs.stop.stop_name

            # Next stop is the subsequent sequence stop, or destination if at the final stop
            next_rs = next((rs for rs in route_stops if rs.sequence > closest_rs.sequence), None)
            next_stop_name = next_rs.stop.stop_name if next_rs else closest_rs.stop.stop_name

            # ETA calculation
            dist_diff = abs(next_rs.distance_km - closest_rs.distance_km) if next_rs else 0.0
            eff_speed = speed if speed > 10 else 35.0  # default 35 km/h if stationary
            eta_mins = max(2, int((dist_diff / eff_speed) * 60)) if next_rs else 0
        else:
            current_stop_name = "Akola Bus Stand"
            next_stop_name = "Shegaon"
            eta_mins = 8

        condition = "Moving" if speed > 5 else "Stationary / Boarding"

        return {
            "status": "success",
            "current_stop": current_stop_name,
            "next_stop": next_stop_name,
            "eta_minutes": eta_mins,
            "condition": condition,
            "speed": speed,
            "processed": True
        }

class TicketingService:
    @staticmethod
    def issue_ticket(data):
        shift_id = data.get('shift_id')
        source_stop_id = data['source_stop_id']
        dest_stop_id = data['dest_stop_id']
        passenger_count = data['passenger_count']
        total_fare = Decimal(str(data['total_fare']))
        timestamp = data['timestamp']

        shift = Shift.objects.filter(shift_id=shift_id).first()
        if not shift:
            shift = Shift.objects.filter(status='Active').first()
        if not shift:
            return {"status": "error", "message": "No active shift found"}

        # Find source and destination stops by ID or Name
        source_stop = (
            Stop.objects.filter(stop_id=source_stop_id).first()
            or Stop.objects.filter(stop_name=source_stop_id).first()
        )
        dest_stop = (
            Stop.objects.filter(stop_id=dest_stop_id).first()
            or Stop.objects.filter(stop_name=dest_stop_id).first()
        )

        if not source_stop or not dest_stop:
            return {"status": "error", "message": "Invalid boarding or destination stop"}

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
            "boarding": source_stop.stop_name,
            "destination": dest_stop.stop_name,
            "total_fare": float(total_fare),
            "message": "Ticket logged securely in PostgreSQL."
        }
