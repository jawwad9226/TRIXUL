from decimal import Decimal, ROUND_HALF_UP
import math

from django.utils import timezone

from . import mock_data


def _route_stops(route):
    ordered = sorted(route["route_stops"], key=lambda item: item["sequence"])
    return [
        {
            **item,
            **mock_data.STOPS[item["stop_id"]],
        }
        for item in ordered
    ]


def _route_matches_stops(route, origin_id, destination_id):
    stops = route["route_stops"]
    positions = {item["stop_id"]: item["sequence"] for item in stops}
    if origin_id and destination_id:
        return (
            origin_id in positions
            and destination_id in positions
            and positions[destination_id] > positions[origin_id]
        )
    if origin_id:
        return origin_id in positions
    if destination_id:
        return destination_id in positions
    return True


def _bus_is_before_or_at_destination(bus, route, destination_id):
    stop_positions = {
        item["stop_id"]: item["sequence"]
        for item in route["route_stops"]
    }
    destination_position = stop_positions.get(destination_id)
    bus_position = stop_positions.get(bus["current_stop_id"])
    return destination_position is not None and bus_position is not None and bus_position <= destination_position


def list_routes(filters):
    query = filters.get("q", "").casefold()
    origin_id = filters.get("origin_stop_id")
    destination_id = filters.get("destination_stop_id")
    results = []
    for route in sorted(mock_data.ROUTES.values(), key=lambda item: item["route_id"]):
        if query and query not in route["route_id"].casefold() and query not in route["route_name"].casefold():
            continue
        if not _route_matches_stops(route, origin_id, destination_id):
            continue
        stops = _route_stops(route)
        route_buses = [
            bus for bus in mock_data.BUSES.values()
            if bus["route_id"] == route["route_id"]
            and (
                not destination_id
                or _bus_is_before_or_at_destination(bus, route, destination_id)
            )
        ]
        results.append(
            {
                "route_id": route["route_id"],
                "route_name": route["route_name"],
                "origin_stop_id": stops[0]["stop_id"] if stops else None,
                "destination_stop_id": stops[-1]["stop_id"] if stops else None,
                "stop_count": len(stops),
                "active_bus_count": len(route_buses),
            }
        )
    return {"data_source": "demo", "routes": results}


def get_route_detail(route_id):
    route = mock_data.ROUTES.get(route_id)
    if route is None:
        return None

    route_stops = _route_stops(route)
    rule = route["fare_rule"]
    fares = []
    if rule:
        base_fare = Decimal(rule["base_fare"])
        per_km_rate = Decimal(rule["per_km_rate"])
        multiplier = Decimal("1.00") - Decimal(rule["discount_percentage"]) / Decimal("100.00")
        for start_index, start in enumerate(route_stops):
            for end in route_stops[start_index + 1:]:
                distance = Decimal(str(abs(end["distance_km"] - start["distance_km"])))
                fare = (base_fare + distance * per_km_rate) * multiplier
                fares.append(
                    {
                        "from_stop_id": start["stop_id"],
                        "to_stop_id": end["stop_id"],
                        "fare": fare.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                    }
                )

    return {
        "data_source": "demo",
        "route_id": route["route_id"],
        "route_name": route["route_name"],
        "route_stops": route_stops,
        "fare_rule": rule,
        "fares": fares,
    }


def list_stops(query):
    normalized_query = (query or "").casefold()
    stops = [
        stop
        for stop in mock_data.STOPS.values()
        if not normalized_query or normalized_query in stop["stop_name"].casefold()
    ]
    stops.sort(key=lambda stop: stop["stop_name"])
    return {"data_source": "demo", "stops": stops}


def _haversine_km(latitude_a, longitude_a, latitude_b, longitude_b):
    earth_radius_km = 6371.0088
    latitude_delta = math.radians(latitude_b - latitude_a)
    longitude_delta = math.radians(longitude_b - longitude_a)
    haversine = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(math.radians(latitude_a))
        * math.cos(math.radians(latitude_b))
        * math.sin(longitude_delta / 2) ** 2
    )
    haversine = min(1.0, max(0.0, haversine))
    return earth_radius_km * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def list_live_buses(route_id=None, destination_stop_id=None):
    now = timezone.now()
    buses = []
    for bus in mock_data.BUSES.values():
        if route_id and bus["route_id"] != route_id:
            continue
        route = mock_data.ROUTES[bus["route_id"]]
        if destination_stop_id and not _bus_is_before_or_at_destination(
            bus,
            route,
            destination_stop_id,
        ):
            continue
        last_updated_at = now
        buses.append(
            {
                **bus,
                "current_stop_name": mock_data.STOPS[bus["current_stop_id"]]["stop_name"],
                "last_updated_at": last_updated_at,
                "is_stale": False,
                "data_source": "demo",
            }
        )
    return {"data_source": "demo", "buses": buses}


def get_bus_eta(bus_id, stop_id):
    bus = mock_data.BUSES.get(bus_id)
    if bus is None:
        return {"error": "No active bus found."}, 404

    route = mock_data.ROUTES[bus["route_id"]]
    stop_on_route = next(
        (item for item in route["route_stops"] if item["stop_id"] == stop_id),
        None,
    )
    if stop_on_route is None:
        return {"error": "Stop is not on the bus's active route."}, 404
    stop = mock_data.STOPS[stop_id]
    distance_km = _haversine_km(
        bus["latitude"],
        bus["longitude"],
        stop["latitude"],
        stop["longitude"],
    )
    stale = False
    eta_minutes = None
    if not stale and bus["speed_kmh"] > 0:
        eta_minutes = math.ceil((distance_km / bus["speed_kmh"]) * 60)

    return {
        "bus_id": bus_id,
        "stop_id": stop_id,
        "distance_km": distance_km,
        "eta_minutes": eta_minutes,
        "speed_kmh": bus["speed_kmh"],
        "last_updated_at": timezone.now(),
        "is_stale": stale,
        "data_source": "demo",
    }, 200
