from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from core.models import Employee, Bus, Stop, Route, RouteStop, FareRule

class Command(BaseCommand):
    help = 'Seeds the database with realistic MSRTC route data for the live demo.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting database seeding...")

        # 1. Create the Conductor
        emp, _ = Employee.objects.get_or_create(
            emp_id="cond-1001",
            defaults={"name": "Suresh Patil", "role": "Conductor", "contact": "9876543210"}
        )
        self.stdout.write(f"Created Employee: {emp.name}")

        # 2. Create the Bus (45 seats + 11 standing)
        bus, _ = Bus.objects.get_or_create(
            bus_id="bus-101",
            defaults={"registration_number": "MH-30-AB-1234", "capacity_total": 56}
        )
        self.stdout.write(f"Created Bus: {bus.registration_number} (Capacity: 56)")

        # 3. Create Real-World Stops (Longitude, Latitude format for PostGIS)
        stops_data = [
            {"stop_id": "STP-AKL", "stop_name": "Akola Bus Stand", "coords": (76.9981, 20.7095)},
            {"stop_id": "STP-SHG", "stop_name": "Shegaon", "coords": (76.6875, 20.7964)},
            {"stop_id": "STP-MLK", "stop_name": "Malkapur", "coords": (76.2230, 20.8853)},
            {"stop_id": "STP-BSL", "stop_name": "Bhusawal", "coords": (75.7851, 21.0437)},
            {"stop_id": "STP-PUN", "stop_name": "Pune Swargate", "coords": (73.8567, 18.5204)},
        ]

        stops_dict = {}
        for s in stops_data:
            stop, _ = Stop.objects.get_or_create(
                stop_id=s["stop_id"],
                defaults={"stop_name": s["stop_name"], "gps_location": Point(s["coords"])}
            )
            stops_dict[s["stop_id"]] = stop
        self.stdout.write("Created Stops: Akola, Shegaon, Malkapur, Bhusawal, Pune")

        # 4. Create the Route
        route, _ = Route.objects.get_or_create(
            route_id="route-102",
            defaults={"route_name": "Akola - Pune (Via Bhusawal)"}
        )
        self.stdout.write(f"Created Route: {route.route_name}")

        # 5. Map the Stops to the Route with accurate distances
        route_stops = [
            (stops_dict["STP-AKL"], 1, 0.0),
            (stops_dict["STP-SHG"], 2, 42.5),
            (stops_dict["STP-MLK"], 3, 53.1),
            (stops_dict["STP-BSL"], 4, 48.2),
            (stops_dict["STP-PUN"], 5, 385.0),
        ]

        for stop, seq, dist in route_stops:
            # FIX: Explicitly extract the string ID from the object
            RouteStop.objects.get_or_create(
                route_id=route.route_id,
                stop_id=stop.stop_id,
                defaults={"sequence": seq, "distance_km": dist}
            )
        self.stdout.write("Mapped stops to Route with realistic distances.")

        # 6. Create Fare Rules
        FareRule.objects.get_or_create(
            route_id=route.route_id,
            defaults={"base_fare": 10.00, "per_km_rate": 1.50}
        )
        self.stdout.write("Applied Fare Rules: Base ₹10 + ₹1.50/km")

        self.stdout.write(self.style.SUCCESS("✅ Database successfully seeded with real-world demo data!"))