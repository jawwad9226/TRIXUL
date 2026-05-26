from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from decimal import Decimal
import time

from api.models import Shift, BusLocation, RouteStop

class Command(BaseCommand):
    help = "Simulates bus telemetry and explains the PostGIS Distance calculations."

    def add_arguments(self, parser):
        parser.add_argument('--shift_id', type=str, default='shift-102-1001-M', help='Shift ID to simulate')

    def handle(self, *args, **options):
        shift_id = options['shift_id']
        try:
            shift = Shift.objects.get(shift_id=shift_id)
        except Shift.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Shift {shift_id} not found."))
            return

        route_stops = RouteStop.objects.filter(route=shift.route).select_related('stop').order_by('sequence')
        if not route_stops.exists():
            self.stdout.write(self.style.ERROR("No stops found for this route."))
            return

        self.stdout.write(self.style.SUCCESS(f"Starting simulation for {shift_id} on {shift.route.route_name}\n"))
        
        self.stdout.write("## 🧮 How Telemetry Math Works in TRIXUL")
        self.stdout.write("When a heartbeat is received, the backend does the following:")
        self.stdout.write("1. Wraps the incoming lat/lon in a `Point(lon, lat, srid=4326)` object.")
        self.stdout.write("2. Uses PostGIS `Distance('stop__gps_location', current_location)` to rank all RouteStops.")
        self.stdout.write("3. The nearest stop is identified (dist). The next stop is just `sequence > nearest_stop.sequence`.")
        self.stdout.write("4. ETA = Distance between stops (km) / Speed (km/h).\n")

        # Simulate moving between the first two stops
        first_stop = route_stops[0].stop
        second_stop = route_stops[1].stop
        
        start_lon, start_lat = first_stop.gps_location.x, first_stop.gps_location.y
        end_lon, end_lat = second_stop.gps_location.x, second_stop.gps_location.y
        
        steps = 5
        speed_kmh = 40.0
        
        for i in range(steps + 1):
            fraction = i / float(steps)
            current_lon = start_lon + (end_lon - start_lon) * fraction
            current_lat = start_lat + (end_lat - start_lat) * fraction
            
            current_location = Point(current_lon, current_lat, srid=4326)
            
            # 1. Save Location
            BusLocation.objects.create(
                shift=shift,
                current_location=current_location,
                speed=speed_kmh
            )
            
            # 2. Native PostGIS Distance calculation
            nearest_rs = RouteStop.objects.filter(route=shift.route).annotate(
                dist=Distance('stop__gps_location', current_location)
            ).order_by('dist').first()
            
            next_rs = RouteStop.objects.filter(
                route=shift.route,
                sequence__gt=nearest_rs.sequence
            ).order_by('sequence').first()
            
            # 3. ETA math
            eta_minutes = 0
            if next_rs:
                distance_km = abs(next_rs.distance_km - nearest_rs.distance_km)
                eta_hours = distance_km / Decimal(speed_kmh)
                eta_minutes = int(eta_hours * 60)
            
            self.stdout.write(f"--- Step {i}/{steps} ---")
            self.stdout.write(f"Bus GPS: {current_lat:.5f}, {current_lon:.5f}")
            self.stdout.write(f"Nearest Stop: {nearest_rs.stop.stop_name} (Sequence: {nearest_rs.sequence})")
            if next_rs:
                self.stdout.write(f"Next Stop: {next_rs.stop.stop_name}")
                self.stdout.write(f"ETA: {eta_minutes} mins (Calculated at {speed_kmh} km/h)")
            else:
                self.stdout.write("Condition: End of Route")
            
            self.stdout.write("")
            time.sleep(1)

        self.stdout.write(self.style.SUCCESS("Simulation complete!"))
