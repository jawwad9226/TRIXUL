from django.contrib import admin
from .models import Employee, Bus, Stop, Route, RouteStop, FareRule, Shift, Ticket, BusLocation

# Register your models here so they appear in /admin/
admin.site.register(Employee)
admin.site.register(Bus)
admin.site.register(Stop)
admin.site.register(Route)
admin.site.register(RouteStop)
admin.site.register(FareRule)
admin.site.register(Shift)
admin.site.register(Ticket)
admin.site.register(BusLocation)