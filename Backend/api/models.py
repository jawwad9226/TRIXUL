from django.contrib.gis.db import models

class Employee(models.Model):
    emp_id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=50) # Admin/Conductor
    contact = models.CharField(max_length=50)

class Bus(models.Model):
    bus_id = models.CharField(max_length=50, primary_key=True)
    registration_number = models.CharField(max_length=50)
    capacity_total = models.IntegerField()

class Stop(models.Model):
    stop_id = models.CharField(max_length=50, primary_key=True)
    stop_name = models.CharField(max_length=255)
    gps_location = models.PointField()

class Route(models.Model):
    route_id = models.CharField(max_length=50, primary_key=True)
    route_name = models.CharField(max_length=255)

class RouteStop(models.Model):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='route_stops')
    stop = models.ForeignKey(Stop, on_delete=models.CASCADE)
    sequence = models.IntegerField()
    distance_km = models.FloatField()

class FareRule(models.Model):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='fare_rules')
    base_fare = models.DecimalField(max_digits=10, decimal_places=2)
    per_km_rate = models.DecimalField(max_digits=10, decimal_places=2)

class Shift(models.Model):
    shift_id = models.CharField(max_length=50, primary_key=True)
    emp = models.ForeignKey(Employee, on_delete=models.CASCADE)
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE)
    route = models.ForeignKey(Route, on_delete=models.CASCADE)
    status = models.CharField(max_length=50)

class Ticket(models.Model):
    ticket_id = models.CharField(max_length=50, primary_key=True)
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE)
    source_stop = models.ForeignKey(Stop, related_name='tickets_from', on_delete=models.CASCADE)
    dest_stop = models.ForeignKey(Stop, related_name='tickets_to', on_delete=models.CASCADE)
    passenger_count = models.IntegerField()
    total_fare = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField()

class BusLocation(models.Model):
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE)
    current_location = models.PointField()
    speed = models.FloatField()
    timestamp = models.DateTimeField()
