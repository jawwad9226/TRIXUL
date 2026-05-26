from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from .models import Employee, Bus, Stop, Route, RouteStop, FareRule, Shift, Ticket, BusLocation

@admin.register(Stop)
class StopAdmin(GISModelAdmin):
    list_display = ('stop_id', 'stop_name')
    search_fields = ('stop_name',)

@admin.register(BusLocation)
class BusLocationAdmin(GISModelAdmin):
    list_display = ('id', 'shift', 'speed', 'timestamp')
    list_filter = ('timestamp',)

admin.site.register(Employee)
admin.site.register(Bus)
admin.site.register(Route)
admin.site.register(RouteStop)
admin.site.register(FareRule)
admin.site.register(Shift)
admin.site.register(Ticket)
