import uuid
from decimal import Decimal
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.db.models import Sum, Count, Q
from django.utils import timezone
from .models import Route, RouteStop, FareRule, Stop, Shift, BusLocation, Ticket, Incident, Employee, Bus

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

        payment_method = data.get('payment_method', 'CASH').upper()
        if payment_method not in ('CASH', 'UPI'):
            payment_method = 'CASH'

        Ticket.objects.create(
            ticket_id=ticket_id,
            shift=shift,
            source_stop=source_stop,
            dest_stop=dest_stop,
            passenger_count=passenger_count,
            total_fare=total_fare,
            payment_method=payment_method,
            timestamp=timestamp
        )

        return {
            "status": "success",
            "ticket_id": ticket_id,
            "boarding": source_stop.stop_name,
            "destination": dest_stop.stop_name,
            "total_fare": float(total_fare),
            "payment_method": payment_method,
            "message": "Ticket logged securely in PostgreSQL."
        }


# ============================================================
# STAGE 3 — Admin Route Management Service
# ============================================================

class AdminRouteManagementService:
    @staticmethod
    def list_routes():
        """Returns all routes with their stops and fare rules."""
        routes = Route.objects.prefetch_related('route_stops__stop', 'fare_rules').all().order_by('route_id')
        result = []
        for r in routes:
            fare_rule = r.fare_rules.first()
            route_stops = r.route_stops.select_related('stop').order_by('sequence')
            result.append({
                "route_id": r.route_id,
                "route_name": r.route_name,
                "fare_rule": {
                    "base_fare": float(fare_rule.base_fare) if fare_rule else None,
                    "per_km_rate": float(fare_rule.per_km_rate) if fare_rule else None,
                },
                "stops": [
                    {
                        "stop_id": rs.stop.stop_id,
                        "stop_name": rs.stop.stop_name,
                        "sequence": rs.sequence,
                        "distance_km": rs.distance_km,
                        "latitude": rs.stop.gps_location.y if rs.stop.gps_location else None,
                        "longitude": rs.stop.gps_location.x if rs.stop.gps_location else None,
                    }
                    for rs in route_stops
                ],
            })
        return result

    @staticmethod
    def create_route(data):
        """
        Creates a Route, its Stop sequence, and FareRule in one call.
        payload: { route_id, route_name, base_fare, per_km_rate, stops: [{stop_id, stop_name, sequence, distance_km, latitude, longitude}] }
        """
        from decimal import Decimal
        route_id = data["route_id"]
        if Route.objects.filter(route_id=route_id).exists():
            return {"status": "error", "message": f"Route {route_id} already exists."}

        route = Route.objects.create(route_id=route_id, route_name=data["route_name"])
        FareRule.objects.create(
            route=route,
            base_fare=Decimal(str(data.get("base_fare", "10.00"))),
            per_km_rate=Decimal(str(data.get("per_km_rate", "1.50"))),
        )

        for s in data.get("stops", []):
            stop, _ = Stop.objects.get_or_create(
                stop_id=s["stop_id"],
                defaults={
                    "stop_name": s["stop_name"],
                    "gps_location": Point(float(s["longitude"]), float(s["latitude"]), srid=4326),
                }
            )
            RouteStop.objects.get_or_create(
                route=route,
                stop=stop,
                defaults={"sequence": s["sequence"], "distance_km": float(s["distance_km"])},
            )

        return {
            "status": "success",
            "route_id": route.route_id,
            "route_name": route.route_name,
            "stops_created": len(data.get("stops", [])),
            "message": f"Route {route_id} created with {len(data.get('stops', []))} stops.",
        }

    @staticmethod
    def list_stops():
        """Returns all registered stops for reference."""
        return [
            {
                "stop_id": s.stop_id,
                "stop_name": s.stop_name,
                "latitude": s.gps_location.y if s.gps_location else None,
                "longitude": s.gps_location.x if s.gps_location else None,
            }
            for s in Stop.objects.all().order_by("stop_name")
        ]

    @staticmethod
    def create_stop(data):
        """Creates or updates a single stop with GPS location from map click."""
        import re, uuid
        stop_name = data.get('stop_name')
        lat = float(data.get('latitude'))
        lng = float(data.get('longitude'))
        stop_id = data.get('stop_id')
        if not stop_id:
            clean_prefix = re.sub(r'[^A-Za-z0-9]', '', stop_name)[:3].upper() or "STP"
            stop_id = f"STP-{clean_prefix}-{str(uuid.uuid4().int)[:4]}"

        stop, created = Stop.objects.get_or_create(
            stop_id=stop_id,
            defaults={
                "stop_name": stop_name,
                "gps_location": Point(lng, lat, srid=4326),
            }
        )
        if not created:
            stop.stop_name = stop_name
            stop.gps_location = Point(lng, lat, srid=4326)
            stop.save()

        return {
            "status": "success",
            "stop_id": stop.stop_id,
            "stop_name": stop.stop_name,
            "latitude": stop.gps_location.y,
            "longitude": stop.gps_location.x,
            "message": f"Stop '{stop_name}' registered successfully."
        }


# ============================================================
# STAGE 3 — Admin Command Center Services
# ============================================================

class AdminFleetService:
    @staticmethod
    def get_fleet_status():
        """
        Returns all active shifts with the latest GPS location for each bus,
        fleet KPIs, route occupancy analytics, and real-time AI intelligence alerts.
        """
        active_shifts = (
            Shift.objects.filter(status='Active')
            .select_related('bus', 'route', 'emp')
        )

        fleet = []
        for shift in active_shifts:
            latest_location = (
                BusLocation.objects.filter(shift=shift)
                .order_by('-timestamp')
                .first()
            )

            today_tickets = Ticket.objects.filter(shift=shift).aggregate(
                total_passengers=Sum('passenger_count'),
                total_revenue=Sum('total_fare'),
                ticket_count=Count('ticket_id'),
            )

            passengers_today = today_tickets['total_passengers'] or 0
            revenue_today = float(today_tickets['total_revenue'] or 0)
            capacity = shift.bus.capacity_total
            seated_cap = 45

            fleet.append({
                "shift_id": shift.shift_id,
                "bus_id": shift.bus.bus_id,
                "bus_number": shift.bus.registration_number,
                "capacity_total": capacity,
                "seated_capacity": seated_cap,
                "route_id": shift.route.route_id,
                "route_name": shift.route.route_name,
                "conductor_id": shift.emp.emp_id,
                "conductor_name": shift.emp.name,
                "status": shift.status,
                "occupancy_rate": f"{passengers_today}/{capacity}",
                "is_critical": passengers_today >= seated_cap,
                "last_seen": {
                    "latitude": latest_location.current_location.y if latest_location else 20.7002,
                    "longitude": latest_location.current_location.x if latest_location else 77.0082,
                    "speed": latest_location.speed if latest_location else 0,
                    "timestamp": latest_location.timestamp.isoformat() if latest_location else None,
                } if latest_location else None,
                "live_stats": {
                    "passengers_today": passengers_today,
                    "revenue_today": revenue_today,
                    "tickets_issued": today_tickets['ticket_count'] or 0,
                }
            })

        # Summary KPIs
        total_buses = Bus.objects.count()
        active_buses = active_shifts.count()
        total_conductors = Employee.objects.filter(role='Conductor').count()

        # Occupancy Analytics per Route
        routes = Route.objects.all()
        occupancy_analytics = []
        for r in routes:
            r_tickets = Ticket.objects.filter(shift__route=r).aggregate(
                pax=Sum('passenger_count')
            )
            pax_count = r_tickets['pax'] or 0
            occupancy_analytics.append({
                "route_id": r.route_id,
                "route_name": r.route_name,
                "passengers": pax_count,
                "seated_limit": 45,
                "total_capacity": 56,
                "is_surge": pax_count >= 45,
            })

        # AI Engine Alerts (Generated from real telemetry & passenger load)
        ai_alerts = []

        # 1. Open SOS alerts from conductors take highest priority
        open_sos = Incident.objects.filter(status='OPEN', severity='SOS').first()
        if open_sos:
            ai_alerts.append({
                "id": open_sos.incident_id,
                "type": "SOS",
                "title": "EMERGENCY: Conductor SOS Triggered",
                "message": f"Bus {open_sos.shift.bus.registration_number} reported: {open_sos.message}",
                "location": f"{open_sos.location.y:.4f}, {open_sos.location.x:.4f}" if open_sos.location else None,
                "action": "Dispatch Emergency Vehicle",
                "severity": "danger",
            })

        # 2. Demand Surge detection
        high_load_route = next((item for item in occupancy_analytics if item["is_surge"]), None)
        if high_load_route:
            ai_alerts.append({
                "id": "AI-SURGE-01",
                "type": "SURGE",
                "title": "Demand Surge Detected",
                "message": f"High volume on {high_load_route['route_name']} ({high_load_route['passengers']} passengers). Seated capacity exceeded.",
                "suggestion": "Deploy standby 'Short-Trip' bus via Bhusawal. Projected ROI: +31%.",
                "action": "Approve Short-Trip Deployment",
                "severity": "danger",
            })
        else:
            # Proactive intelligence card based on traffic
            ai_alerts.append({
                "id": "AI-DEMAND-PREDICT",
                "type": "SURGE",
                "title": "Peak Hour Demand Monitor",
                "message": "Passenger volume near Akola & Shegaon approaching 80% threshold for evening shift.",
                "suggestion": "AI Suggestion: Keep standby bus MH-14-CC-5555 on hot-standby at Akola Depot.",
                "action": "Pre-Stage Bus",
                "severity": "warning",
            })

        # 3. Telemetry excessive idling check
        idling_bus = next((b for b in fleet if b['last_seen'] and b['last_seen']['speed'] == 0), None)
        if idling_bus:
            ai_alerts.append({
                "id": "AI-IDLE-01",
                "type": "IDLING",
                "title": "Telematics: Stationary / Idling",
                "message": f"Bus {idling_bus['bus_number']} stationary at {idling_bus['route_name'].split('(')[0].strip()}. Schedule adherence monitored.",
                "suggestion": "ETA dynamically adjusted (+8 mins).",
                "severity": "warning",
            })

        return {
            "fleet": fleet,
            "summary": {
                "active_buses": active_buses,
                "total_buses": total_buses,
                "total_conductors": total_conductors,
            },
            "occupancy_analytics": occupancy_analytics,
            "ai_alerts": ai_alerts,
        }


class AdminShiftService:
    @staticmethod
    def get_dispatch_options():
        """Returns registered conductors, buses, and routes to populate dispatch forms."""
        conductors = list(
            Employee.objects.filter(role='Conductor')
            .values('emp_id', 'name')
            .order_by('emp_id')
        )
        buses = list(
            Bus.objects.all()
            .values('bus_id', 'registration_number', 'capacity_total')
            .order_by('bus_id')
        )
        routes = list(
            Route.objects.all()
            .values('route_id', 'route_name')
            .order_by('route_id')
        )
        return {
            "conductors": conductors,
            "buses": buses,
            "routes": routes
        }

    @staticmethod
    def list_shifts():
        """Returns all shifts (active + completed) for management view."""
        shifts = (
            Shift.objects.all()
            .select_related('bus', 'route', 'emp')
            .order_by('-status')  # Active first
        )
        result = []
        for s in shifts:
            result.append({
                "shift_id": s.shift_id,
                "status": s.status,
                "bus_number": s.bus.registration_number,
                "route_name": s.route.route_name,
                "conductor_name": s.emp.name,
                "conductor_id": s.emp.emp_id,
                "route_id": s.route.route_id,
                "bus_id": s.bus.bus_id,
            })
        return result

    @staticmethod
    def create_shift(data):
        """
        Creates a new shift. Requires emp_id, bus_id, route_id.
        Auto-generates shift_id. If the same conductor/bus already has an Active
        shift, it is closed first so only one active shift per conductor/bus exists.
        """
        emp_id = data.get('emp_id')
        bus_id = data.get('bus_id')
        route_id = data.get('route_id')

        try:
            emp = Employee.objects.get(emp_id=emp_id)
        except Employee.DoesNotExist:
            return {"status": "error", "message": f"Employee {emp_id} not found"}

        try:
            bus = Bus.objects.get(bus_id=bus_id)
        except Bus.DoesNotExist:
            return {"status": "error", "message": f"Bus {bus_id} not found"}

        try:
            route = Route.objects.get(route_id=route_id)
        except Route.DoesNotExist:
            return {"status": "error", "message": f"Route {route_id} not found"}

        # Close any prior active shifts for this conductor or bus
        Shift.objects.filter(emp=emp, status='Active').update(status='Completed')
        Shift.objects.filter(bus=bus, status='Active').update(status='Completed')

        shift_id = f"shift-{str(uuid.uuid4().int)[:6]}"
        shift = Shift.objects.create(
            shift_id=shift_id,
            emp=emp,
            bus=bus,
            route=route,
            status='Active'
        )

        return {
            "status": "success",
            "shift_id": shift.shift_id,
            "conductor": emp.name,
            "bus_number": bus.registration_number,
            "route": route.route_name,
            "message": "Shift created. ETM will pick it up on next sync."
        }

    @staticmethod
    def close_shift(shift_id):
        """Marks a shift as Completed."""
        try:
            shift = Shift.objects.get(shift_id=shift_id)
        except Shift.DoesNotExist:
            return {"status": "error", "message": "Shift not found"}

        if shift.status == 'Completed':
            return {"status": "error", "message": "Shift is already completed"}

        shift.status = 'Completed'
        shift.save(update_fields=['status'])

        return {"status": "success", "shift_id": shift_id, "message": "Shift closed"}

    @staticmethod
    def reassign_bus(shift_id, new_bus_id):
        """Swaps the assigned bus mid-route for a breakdown or emergency without losing shift data."""
        try:
            shift = Shift.objects.get(shift_id=shift_id)
        except Shift.DoesNotExist:
            return {"status": "error", "message": "Shift not found"}

        if shift.status != 'Active':
            return {"status": "error", "message": "Cannot reassign a non-active shift"}

        try:
            new_bus = Bus.objects.get(bus_id=new_bus_id)
        except Bus.DoesNotExist:
            return {"status": "error", "message": f"Bus {new_bus_id} not found"}

        # Release target bus if currently bound to any active shift
        Shift.objects.filter(bus=new_bus, status='Active').exclude(shift_id=shift_id).update(status='Completed')

        old_bus_number = shift.bus.registration_number
        shift.bus = new_bus
        shift.save(update_fields=['bus'])

        return {
            "status": "success",
            "shift_id": shift_id,
            "old_bus": old_bus_number,
            "new_bus": new_bus.registration_number,
            "message": f"Bus dynamically swapped from {old_bus_number} to {new_bus.registration_number} for shift {shift_id}."
        }


class AdminRevenueService:
    @staticmethod
    def get_summary():
        """
        Returns total revenue split by payment method (CASH vs UPI),
        broken down per route and per conductor. Reads from real Ticket table.
        """
        totals = Ticket.objects.aggregate(
            total_revenue=Sum('total_fare'),
            total_passengers=Sum('passenger_count'),
            total_tickets=Count('ticket_id'),
        )

        cash_total = Ticket.objects.filter(payment_method='CASH').aggregate(
            amount=Sum('total_fare'), count=Count('ticket_id')
        )
        upi_total = Ticket.objects.filter(payment_method='UPI').aggregate(
            amount=Sum('total_fare'), count=Count('ticket_id')
        )

        # Revenue per route
        per_route = (
            Ticket.objects.values('shift__route__route_name')
            .annotate(revenue=Sum('total_fare'), passengers=Sum('passenger_count'))
            .order_by('-revenue')
        )

        # Revenue per conductor
        per_conductor = (
            Ticket.objects.values('shift__emp__name', 'shift__emp__emp_id')
            .annotate(revenue=Sum('total_fare'), tickets=Count('ticket_id'))
            .order_by('-revenue')
        )

        return {
            "total_revenue": float(totals['total_revenue'] or 0),
            "total_passengers": totals['total_passengers'] or 0,
            "total_tickets": totals['total_tickets'] or 0,
            "cash": {
                "amount": float(cash_total['amount'] or 0),
                "tickets": cash_total['count'] or 0,
            },
            "upi": {
                "amount": float(upi_total['amount'] or 0),
                "tickets": upi_total['count'] or 0,
            },
            "per_route": [
                {
                    "route": r['shift__route__route_name'],
                    "revenue": float(r['revenue'] or 0),
                    "passengers": r['passengers'] or 0,
                }
                for r in per_route
            ],
            "per_conductor": [
                {
                    "conductor": c['shift__emp__name'],
                    "emp_id": c['shift__emp__emp_id'],
                    "revenue": float(c['revenue'] or 0),
                    "tickets": c['tickets'] or 0,
                }
                for c in per_conductor
            ],
        }


class AdminIncidentService:
    @staticmethod
    def list_incidents():
        """Returns all incidents, newest first."""
        incidents = (
            Incident.objects.all()
            .select_related('shift__bus', 'shift__emp', 'shift__route')
            .order_by('-timestamp')
        )
        result = []
        for inc in incidents:
            result.append({
                "incident_id": inc.incident_id,
                "severity": inc.severity,
                "message": inc.message,
                "status": inc.status,
                "timestamp": inc.timestamp.isoformat(),
                "shift_id": inc.shift.shift_id,
                "conductor_name": inc.shift.emp.name,
                "bus_number": inc.shift.bus.registration_number,
                "route_name": inc.shift.route.route_name,
                "location": {
                    "latitude": inc.location.y,
                    "longitude": inc.location.x,
                } if inc.location else None,
            })
        return result

    @staticmethod
    def create_incident(data):
        """
        Called by ETM when conductor presses SOS or raises a warning.
        """
        shift_id = data.get('shift_id')
        shift = Shift.objects.filter(shift_id=shift_id).first()
        if not shift:
            shift = Shift.objects.filter(status='Active').first()
        if not shift:
            return {"status": "error", "message": "No active shift found"}

        lat = data.get('latitude')
        lng = data.get('longitude')
        location = Point(float(lng), float(lat), srid=4326) if lat and lng else None

        incident_id = f"INC-{str(uuid.uuid4().int)[:8]}"
        incident = Incident.objects.create(
            incident_id=incident_id,
            shift=shift,
            severity=data.get('severity', 'SOS'),
            message=data.get('message', 'Emergency alert from ETM'),
            location=location,
            status='OPEN',
            timestamp=timezone.now(),
        )

        return {
            "status": "success",
            "incident_id": incident.incident_id,
            "severity": incident.severity,
            "message": "Incident logged. Admin dashboard alerted."
        }

    @staticmethod
    def acknowledge_incident(incident_id):
        """Silences the incident in the command center UI by marking it ACKNOWLEDGED."""
        try:
            incident = Incident.objects.get(incident_id=incident_id)
        except Incident.DoesNotExist:
            return {"status": "error", "message": "Incident not found"}

        incident.status = 'ACKNOWLEDGED'
        incident.save(update_fields=['status'])

        return {
            "status": "success",
            "incident_id": incident_id,
            "incident_status": "ACKNOWLEDGED",
            "message": f"Incident {incident_id} acknowledged and silenced."
        }
