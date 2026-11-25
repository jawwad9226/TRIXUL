from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from core.models import Employee, Bus, Stop, Route, RouteStop, FareRule, Shift

class Command(BaseCommand):
    help = 'Seeds the TRIXUL database with realistic MSRTC Maharashtra route data.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING("🚌 Starting TRIXUL database seeding..."))

        # ── 1. Conductors ───────────────────────────────────────────────────
        conductors_data = [
            {"emp_id": "cond-1001", "name": "Suresh Patil",    "contact": "9876543210"},
            {"emp_id": "cond-1002", "name": "Ramesh Kulkarni", "contact": "9876543211"},
            {"emp_id": "cond-1003", "name": "Sachin Gaikwad",  "contact": "9876543212"},
            {"emp_id": "cond-1004", "name": "Amit Shirsat",    "contact": "9876543213"},
        ]
        for c in conductors_data:
            Employee.objects.get_or_create(
                emp_id=c["emp_id"],
                defaults={"name": c["name"], "role": "Conductor", "contact": c["contact"]}
            )
        self.stdout.write("  ✅ Created 4 Conductors")

        # ── 2. Buses (45 seated + 11 standing = 56 total) ───────────────────
        buses_data = [
            {"bus_id": "bus-101", "registration_number": "MH-30-AB-1234", "capacity_total": 56},
            {"bus_id": "bus-102", "registration_number": "MH-14-CC-5555", "capacity_total": 56},
            {"bus_id": "bus-103", "registration_number": "MH-12-XY-9876", "capacity_total": 56},
            {"bus_id": "bus-104", "registration_number": "MH-30-BK-7777", "capacity_total": 56},
        ]
        buses = {}
        for b in buses_data:
            bus, _ = Bus.objects.get_or_create(
                bus_id=b["bus_id"],
                defaults={"registration_number": b["registration_number"], "capacity_total": b["capacity_total"]}
            )
            buses[b["bus_id"]] = bus
        self.stdout.write("  ✅ Created 4 Buses (56-capacity MSRTC standard)")

        # ── 3. All Stops with verified GPS coordinates ───────────────────────
        # Coordinates are (longitude, latitude) — PostGIS Point(lon, lat)
        stops_data = [
            # Vidarbha Region (Akola district belt)
            {"stop_id": "STP-AKL",  "stop_name": "Akola Bus Stand",        "coords": (77.0022, 20.7002)},
            {"stop_id": "STP-MRT",  "stop_name": "Murtizapur",             "coords": (76.6765, 20.7325)},
            {"stop_id": "STP-KAR",  "stop_name": "Karanja (Lad)",          "coords": (77.4826, 20.4836)},
            {"stop_id": "STP-SHG",  "stop_name": "Shegaon Bus Stand",      "coords": (76.6908, 20.7932)},
            {"stop_id": "STP-KHG",  "stop_name": "Khamgaon Bus Stand",     "coords": (76.5700, 20.7055)},
            {"stop_id": "STP-JLG",  "stop_name": "Jalgaon City Bus Stand", "coords": (75.5626, 21.0051)},
            {"stop_id": "STP-MLK",  "stop_name": "Malkapur Bus Stand",     "coords": (76.2023, 20.8872)},
            {"stop_id": "STP-BSL",  "stop_name": "Bhusawal Bus Stand",     "coords": (75.7952, 21.0455)},
            {"stop_id": "STP-MAN",  "stop_name": "Manmad Junction",        "coords": (74.4411, 20.2516)},
            {"stop_id": "STP-NSK",  "stop_name": "Nashik CBS",             "coords": (73.7898, 19.9975)},
            {"stop_id": "STP-PUN",  "stop_name": "Pune Swargate",          "coords": (73.8588, 18.5018)},
            {"stop_id": "STP-MUM",  "stop_name": "Mumbai Central ST",      "coords": (72.8213, 18.9696)},
        ]
        stops = {}
        for s in stops_data:
            stop, _ = Stop.objects.get_or_create(
                stop_id=s["stop_id"],
                defaults={
                    "stop_name": s["stop_name"],
                    "gps_location": Point(s["coords"][0], s["coords"][1], srid=4326),
                }
            )
            stops[s["stop_id"]] = stop
        self.stdout.write(f"  ✅ Created {len(stops_data)} Stops with verified GPS coordinates")

        # ── 4. Routes & their stop sequences ────────────────────────────────
        routes_config = [
            {
                "route_id": "route-101",
                "route_name": "Akola - Shegaon Shuttle",
                "base_fare": "10.00",
                "per_km_rate": "1.50",
                "stops": [
                    ("STP-AKL", 1, 0.0),
                    ("STP-SHG", 2, 42.5),
                ],
            },
            {
                "route_id": "route-102",
                "route_name": "Akola - Pune (Via Bhusawal)",
                "base_fare": "10.00",
                "per_km_rate": "1.50",
                "stops": [
                    ("STP-AKL", 1,   0.0),
                    ("STP-SHG", 2,  42.5),
                    ("STP-MLK", 3,  95.6),
                    ("STP-BSL", 4, 143.8),
                    ("STP-MAN", 5, 243.0),
                    ("STP-NSK", 6, 290.5),
                    ("STP-PUN", 7, 528.8),
                ],
            },
            {
                "route_id": "route-103",
                "route_name": "Akola - Khamgaon Express",
                "base_fare": "10.00",
                "per_km_rate": "1.50",
                "stops": [
                    ("STP-AKL", 1,  0.0),
                    ("STP-KHG", 2, 38.0),
                ],
            },
            {
                "route_id": "route-104",
                "route_name": "Akola - Jalgaon (Via Bhusawal)",
                "base_fare": "10.00",
                "per_km_rate": "1.50",
                "stops": [
                    ("STP-AKL", 1,   0.0),
                    ("STP-SHG", 2,  42.5),
                    ("STP-MLK", 3,  95.6),
                    ("STP-BSL", 4, 143.8),
                    ("STP-JLG", 5, 169.3),
                ],
            },
            {
                "route_id": "route-105",
                "route_name": "Bhusawal - Mumbai Express",
                "base_fare": "15.00",
                "per_km_rate": "1.80",
                "stops": [
                    ("STP-BSL", 1,   0.0),
                    ("STP-MAN", 2,  99.2),
                    ("STP-NSK", 3, 146.7),
                    ("STP-MUM", 4, 332.5),
                ],
            },
        ]

        for rc in routes_config:
            route, _ = Route.objects.get_or_create(
                route_id=rc["route_id"],
                defaults={"route_name": rc["route_name"]}
            )
            FareRule.objects.get_or_create(
                route=route,
                defaults={"base_fare": rc["base_fare"], "per_km_rate": rc["per_km_rate"]}
            )
            for stop_id, seq, dist_km in rc["stops"]:
                RouteStop.objects.get_or_create(
                    route=route,
                    stop=stops[stop_id],
                    defaults={"sequence": seq, "distance_km": dist_km}
                )
            self.stdout.write(f"  ✅ Route {rc['route_id']}: {rc['route_name']} ({len(rc['stops'])} stops)")

        # ── 5. Active Shifts (one per conductor/bus pair) ────────────────────
        shifts_data = [
            {"shift_id": "shift-001", "emp_id": "cond-1001", "bus_id": "bus-101", "route_id": "route-102"},
            {"shift_id": "shift-002", "emp_id": "cond-1002", "bus_id": "bus-102", "route_id": "route-101"},
            {"shift_id": "shift-003", "emp_id": "cond-1003", "bus_id": "bus-103", "route_id": "route-103"},
        ]
        for sd in shifts_data:
            shift, created = Shift.objects.get_or_create(
                shift_id=sd["shift_id"],
                defaults={
                    "emp": Employee.objects.get(emp_id=sd["emp_id"]),
                    "bus": buses[sd["bus_id"]],
                    "route": Route.objects.get(route_id=sd["route_id"]),
                    "status": "Active"
                }
            )
            if not created and shift.status != "Active":
                shift.status = "Active"
                shift.save(update_fields=["status"])
        self.stdout.write("  ✅ Created/Reactivated 3 Active Shifts")

        self.stdout.write(self.style.SUCCESS(
            "\n🎉 Database seeded with TRIXUL demo data!\n"
            "   • 4 conductors  • 4 buses  • 12 stops\n"
            "   • 5 routes with fare rules  • 3 active shifts\n"
            "   Run the Admin Dashboard to see live telemetry."
        ))
