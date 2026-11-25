"""Static local-only demo records used instead of a persistent transit database."""

STOPS = {
    "STP-AKL": {
        "stop_id": "STP-AKL",
        "stop_name": "Akola Bus Stand",
        "longitude": 77.0022,
        "latitude": 20.7002,
    },
    "STP-MRT": {
        "stop_id": "STP-MRT",
        "stop_name": "Murtizapur",
        "longitude": 76.6765,
        "latitude": 20.7325,
    },
    "STP-KAR": {
        "stop_id": "STP-KAR",
        "stop_name": "Karanja (Lad)",
        "longitude": 77.4826,
        "latitude": 20.4836,
    },
    "STP-SHG": {
        "stop_id": "STP-SHG",
        "stop_name": "Shegaon Bus Stand",
        "longitude": 76.6908,
        "latitude": 20.7932,
    },
    "STP-KHG": {
        "stop_id": "STP-KHG",
        "stop_name": "Khamgaon Bus Stand",
        "longitude": 76.5700,
        "latitude": 20.7055,
    },
    "STP-JLG": {
        "stop_id": "STP-JLG",
        "stop_name": "Jalgaon City Bus Stand",
        "longitude": 75.5626,
        "latitude": 21.0051,
    },
    "STP-MLK": {
        "stop_id": "STP-MLK",
        "stop_name": "Malkapur Bus Stand",
        "longitude": 76.2023,
        "latitude": 20.8872,
    },
    "STP-BSL": {
        "stop_id": "STP-BSL",
        "stop_name": "Bhusawal Bus Stand",
        "longitude": 75.7952,
        "latitude": 21.0455,
    },
    "STP-MAN": {
        "stop_id": "STP-MAN",
        "stop_name": "Manmad Junction",
        "longitude": 74.4411,
        "latitude": 20.2516,
    },
    "STP-NSK": {
        "stop_id": "STP-NSK",
        "stop_name": "Nashik CBS",
        "longitude": 73.7898,
        "latitude": 19.9975,
    },
    "STP-PUN": {
        "stop_id": "STP-PUN",
        "stop_name": "Pune Swargate",
        "longitude": 73.8588,
        "latitude": 18.5018,
    },
    "STP-MUM": {
        "stop_id": "STP-MUM",
        "stop_name": "Mumbai Central ST",
        "longitude": 72.8213,
        "latitude": 18.9696,
    },
}


def _route_stops(sequence):
    return [
        {
            "stop_id": stop_id,
            "sequence": order,
            "distance_km": distance,
        }
        for stop_id, order, distance in sequence
    ]


ROUTES = {
    "route-101": {
        "route_id": "route-101",
        "route_name": "Akola - Shegaon Shuttle",
        "route_stops": _route_stops([("STP-AKL", 1, 0.0), ("STP-SHG", 2, 42.5)]),
        "fare_rule": {
            "base_fare": "10.00",
            "per_km_rate": "1.50",
            "discount_percentage": "0.00",
        },
    },
    "route-102": {
        "route_id": "route-102",
        "route_name": "Akola - Pune (Via Bhusawal)",
        "route_stops": _route_stops([
            ("STP-AKL", 1, 0.0), ("STP-SHG", 2, 42.5), ("STP-MLK", 3, 95.6),
            ("STP-BSL", 4, 143.8), ("STP-MAN", 5, 243.0), ("STP-NSK", 6, 290.5),
            ("STP-PUN", 7, 528.8),
        ]),
        "fare_rule": {
            "base_fare": "10.00",
            "per_km_rate": "1.50",
            "discount_percentage": "0.00",
        },
    },
    "route-103": {
        "route_id": "route-103",
        "route_name": "Akola - Khamgaon Express",
        "route_stops": _route_stops([("STP-AKL", 1, 0.0), ("STP-KHG", 2, 38.0)]),
        "fare_rule": {
            "base_fare": "10.00",
            "per_km_rate": "1.50",
            "discount_percentage": "0.00",
        },
    },
    "route-104": {
        "route_id": "route-104",
        "route_name": "Akola - Jalgaon (Via Bhusawal)",
        "route_stops": _route_stops([
            ("STP-AKL", 1, 0.0), ("STP-SHG", 2, 42.5), ("STP-MLK", 3, 95.6),
            ("STP-BSL", 4, 143.8), ("STP-JLG", 5, 169.3),
        ]),
        "fare_rule": {
            "base_fare": "10.00",
            "per_km_rate": "1.50",
            "discount_percentage": "0.00",
        },
    },
    "route-105": {
        "route_id": "route-105",
        "route_name": "Bhusawal - Mumbai Express",
        "route_stops": _route_stops([
            ("STP-BSL", 1, 0.0), ("STP-MAN", 2, 99.2), ("STP-NSK", 3, 146.7),
            ("STP-MUM", 4, 332.5),
        ]),
        "fare_rule": {
            "base_fare": "15.00",
            "per_km_rate": "1.80",
            "discount_percentage": "0.00",
        },
    },
    "route-106": {
        "route_id": "route-106",
        "route_name": "Murtizapur - Karanja (Via Akola)",
        "route_stops": _route_stops([
            ("STP-MRT", 1, 0.0), ("STP-AKL", 2, 45.0), ("STP-KAR", 3, 92.0),
        ]),
        "fare_rule": {
            "base_fare": "10.00",
            "per_km_rate": "1.50",
            "discount_percentage": "0.00",
        },
    },
    "route-107": {
        "route_id": "route-107",
        "route_name": "Akola - Murtizapur Local",
        "route_stops": _route_stops([
            ("STP-AKL", 1, 0.0), ("STP-MRT", 2, 45.0),
        ]),
        "fare_rule": {
            "base_fare": "8.00",
            "per_km_rate": "1.40",
            "discount_percentage": "0.00",
        },
    },
    "route-108": {
        "route_id": "route-108",
        "route_name": "Khamgaon - Bhusawal (Via Akola)",
        "route_stops": _route_stops([
            ("STP-KHG", 1, 0.0), ("STP-AKL", 2, 38.0), ("STP-SHG", 3, 80.5),
            ("STP-MLK", 4, 133.6), ("STP-BSL", 5, 181.8),
        ]),
        "fare_rule": {
            "base_fare": "10.00",
            "per_km_rate": "1.50",
            "discount_percentage": "0.00",
        },
    },
}


def _bus(bus_id, registration, route_id, current_stop_id, speed_kmh):
    stop = STOPS[current_stop_id]
    return {
        "bus_id": bus_id,
        "bus_registration": registration,
        "route_id": route_id,
        "current_stop_id": current_stop_id,
        "latitude": stop["latitude"],
        "longitude": stop["longitude"],
        "speed_kmh": speed_kmh,
    }


BUSES = {
    "bus-101": _bus("bus-101", "MH-30-AB-1234", "route-102", "STP-SHG", 35.0),
    "bus-102": _bus("bus-102", "MH-14-CC-5555", "route-101", "STP-AKL", 35.0),
    "bus-103": _bus("bus-103", "MH-12-XY-9876", "route-103", "STP-KHG", 35.0),
    "bus-104": _bus("bus-104", "MH-30-DE-2468", "route-102", "STP-BSL", 42.0),
    "bus-105": _bus("bus-105", "MH-30-FG-1357", "route-101", "STP-SHG", 28.0),
    "bus-106": _bus("bus-106", "MH-30-HJ-8642", "route-101", "STP-AKL", 32.0),
    "bus-107": _bus("bus-107", "MH-30-KL-9753", "route-104", "STP-MLK", 38.0),
    "bus-108": _bus("bus-108", "MH-30-MN-5310", "route-104", "STP-BSL", 30.0),
    "bus-109": _bus("bus-109", "MH-19-PR-4321", "route-105", "STP-NSK", 45.0),
    "bus-110": _bus("bus-110", "MH-19-ST-6789", "route-105", "STP-BSL", 34.0),
    "bus-111": _bus("bus-111", "MH-28-UV-1122", "route-103", "STP-AKL", 31.0),
    "bus-112": _bus("bus-112", "MH-28-WX-3344", "route-106", "STP-AKL", 36.0),
    "bus-113": _bus("bus-113", "MH-28-YZ-5566", "route-106", "STP-KAR", 27.0),
    "bus-114": _bus("bus-114", "MH-28-AB-7788", "route-107", "STP-MRT", 29.0),
    "bus-115": _bus("bus-115", "MH-28-CD-9900", "route-108", "STP-AKL", 33.0),
    "bus-116": _bus("bus-116", "MH-28-EF-2244", "route-108", "STP-MLK", 40.0),
}
