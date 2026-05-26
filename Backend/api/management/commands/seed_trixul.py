from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from api.models import Employee, Bus, Stop, Route, RouteStop, Shift

class Command(BaseCommand):
    help = 'Seeds the database with initial TRIXUL mock data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # Route
        route, _ = Route.objects.get_or_create(
            route_id='route-102',
            defaults={'route_name': 'Terminal Express Corridor'}
        )

        # Stops
        stop1, _ = Stop.objects.get_or_create(
            stop_id='s1',
            defaults={
                'stop_name': 'Jalgaon',
                'gps_location': Point(78.4867, 17.385, srid=4326)
            }
        )

        stop2, _ = Stop.objects.get_or_create(
            stop_id='s2',
            defaults={
                'stop_name': 'Kherda',
                'gps_location': Point(78.4955, 17.392, srid=4326)
            }
        )

        # RouteStops
        RouteStop.objects.get_or_create(
            route=route, stop=stop1, defaults={'sequence': 1, 'distance_km': 0.0}
        )
        RouteStop.objects.get_or_create(
            route=route, stop=stop2, defaults={'sequence': 2, 'distance_km': 1.5}
        )

        # Bus
        bus, _ = Bus.objects.get_or_create(
            bus_id='BUS-102',
            defaults={
                'registration_number': 'TS09 TRX 102',
                'capacity_total': 56
            }
        )

        # Employee
        employee, _ = Employee.objects.get_or_create(
            emp_id='cond-1001',
            defaults={
                'name': 'Harshal Patil',
                'role': 'Conductor',
                'contact': '9876543210'
            }
        )

        # Shift
        Shift.objects.get_or_create(
            shift_id='shift-999',
            defaults={
                'emp': employee,
                'bus': bus,
                'route': route,
                'status': 'Active'
            }
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded TRIXUL database.'))
