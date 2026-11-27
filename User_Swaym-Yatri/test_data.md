# Swayam Yatri Test Data

This reference lists the fixtures used by the isolated mock backend. The data is defined in `Backend/transit/mock_data.py`; it is not stored in a database. The values are for local testing only and are not official transport data or real live telemetry.

## Stops

Coordinates are longitude and latitude in decimal degrees (WGS 84).

| Stop ID | Stop name | Latitude | Longitude |
|---|---|---:|---:|
| `STP-AKL` | Akola Bus Stand | 20.7002 | 77.0022 |
| `STP-MRT` | Murtizapur | 20.7325 | 76.6765 |
| `STP-KAR` | Karanja (Lad) | 20.4836 | 77.4826 |
| `STP-SHG` | Shegaon Bus Stand | 20.7932 | 76.6908 |
| `STP-KHG` | Khamgaon Bus Stand | 20.7055 | 76.5700 |
| `STP-JLG` | Jalgaon City Bus Stand | 21.0051 | 75.5626 |
| `STP-MLK` | Malkapur Bus Stand | 20.8872 | 76.2023 |
| `STP-BSL` | Bhusawal Bus Stand | 21.0455 | 75.7952 |
| `STP-MAN` | Manmad Junction | 20.2516 | 74.4411 |
| `STP-NSK` | Nashik CBS | 19.9975 | 73.7898 |
| `STP-PUN` | Pune Swargate | 18.5018 | 73.8588 |
| `STP-MUM` | Mumbai Central ST | 18.9696 | 72.8213 |

All listed stops are used by at least one route.

## Routes and ordered stops

Stop distance is in kilometres from that route's starting stop.

| Route ID | Route name | Stop sequence (`stop_id` — distance km) |
|---|---|---|
| `route-101` | Akola - Shegaon Shuttle | `STP-AKL` — 0.0 → `STP-SHG` — 42.5 |
| `route-102` | Akola - Pune (Via Bhusawal) | `STP-AKL` — 0.0 → `STP-SHG` — 42.5 → `STP-MLK` — 95.6 → `STP-BSL` — 143.8 → `STP-MAN` — 243.0 → `STP-NSK` — 290.5 → `STP-PUN` — 528.8 |
| `route-103` | Akola - Khamgaon Express | `STP-AKL` — 0.0 → `STP-KHG` — 38.0 |
| `route-104` | Akola - Jalgaon (Via Bhusawal) | `STP-AKL` — 0.0 → `STP-SHG` — 42.5 → `STP-MLK` — 95.6 → `STP-BSL` — 143.8 → `STP-JLG` — 169.3 |
| `route-105` | Bhusawal - Mumbai Express | `STP-BSL` — 0.0 → `STP-MAN` — 99.2 → `STP-NSK` — 146.7 → `STP-MUM` — 332.5 |
| `route-106` | Murtizapur - Karanja (Via Akola) | `STP-MRT` — 0.0 → `STP-AKL` — 45.0 → `STP-KAR` — 92.0 |
| `route-107` | Akola - Murtizapur Local | `STP-AKL` — 0.0 → `STP-MRT` — 45.0 |
| `route-108` | Khamgaon - Bhusawal (Via Akola) | `STP-KHG` — 0.0 → `STP-AKL` — 38.0 → `STP-SHG` — 80.5 → `STP-MLK` — 133.6 → `STP-BSL` — 181.8 |

For route search:

- Valid forward example: origin `STP-AKL`, destination `STP-SHG` returns routes `route-101`, `route-102`, `route-104`, and `route-108`.
- Valid connected example: origin `STP-MRT`, destination `STP-KAR` returns route `route-106`, which serves both stops via Akola.
- Valid connected example: origin `STP-KHG`, destination `STP-BSL` returns route `route-108`.
- Reverse example: origin `STP-SHG`, destination `STP-AKL` returns no matching route.
- Route-name search example: `q=Shegaon` finds `route-101`.
- Route search results include `active_bus_count`; with source/destination selected, it excludes buses whose current stop is after the destination.

## Fare fixtures

Fare calculation is `base_fare + distance_km * per_km_rate`, adjusted by `discount_percentage`. Values below are examples for the first-to-last stop pair on each route; API fares are calculated for each downstream stop pair.

| Route ID | Base fare | Per-km rate | Discount | First-to-last example |
|---|---:|---:|---:|---:|
| `route-101` | ₹10.00 | ₹1.50 | 0% | Akola → Shegaon: ₹73.75 |
| `route-102` | ₹10.00 | ₹1.50 | 0% | Akola → Pune: ₹803.20 |
| `route-103` | ₹10.00 | ₹1.50 | 0% | Akola → Khamgaon: ₹67.00 |
| `route-104` | ₹10.00 | ₹1.50 | 0% | Akola → Jalgaon: ₹263.95 |
| `route-105` | ₹15.00 | ₹1.80 | 0% | Bhusawal → Mumbai: ₹613.50 |
| `route-106` | ₹10.00 | ₹1.50 | 0% | Murtizapur → Karanja: ₹148.00 |
| `route-107` | ₹8.00 | ₹1.40 | 0% | Akola → Murtizapur: ₹71.00 |
| `route-108` | ₹10.00 | ₹1.50 | 0% | Khamgaon → Bhusawal: ₹282.70 |

These are illustrative test fares. The current mock fare rules do not encode Mahila Sanman or Senior Citizen concessions.

## Bus fixtures

Bus current stops and speeds are static mock values. Each bus has a `current_stop_id` and `current_stop_name`; selecting that bus displays it at the corresponding stop on the timeline. When a destination is chosen, the timeline shows the selected journey through that destination. If the selected bus is upstream of the origin, the timeline extends back to its current stop; earlier stops before the bus's current stop are not shown. The bus-list endpoint excludes buses already past the destination; a bus at the destination is still eligible. `last_updated_at` is generated when the API responds and does not mean the bus is transmitting live GPS.

| Bus ID | Registration | Route ID | Current stop | Speed |
|---|---|---|---|---:|
| `bus-101` | `MH-30-AB-1234` | `route-102` | Shegaon (`STP-SHG`) | 35.0 km/h |
| `bus-102` | `MH-14-CC-5555` | `route-101` | Akola (`STP-AKL`) | 35.0 km/h |
| `bus-103` | `MH-12-XY-9876` | `route-103` | Khamgaon (`STP-KHG`) | 35.0 km/h |
| `bus-104` | `MH-30-DE-2468` | `route-102` | Bhusawal (`STP-BSL`) | 42.0 km/h |
| `bus-105` | `MH-30-FG-1357` | `route-101` | Shegaon (`STP-SHG`) | 28.0 km/h |
| `bus-106` | `MH-30-HJ-8642` | `route-101` | Akola (`STP-AKL`) | 32.0 km/h |
| `bus-107` | `MH-30-KL-9753` | `route-104` | Malkapur (`STP-MLK`) | 38.0 km/h |
| `bus-108` | `MH-30-MN-5310` | `route-104` | Bhusawal (`STP-BSL`) | 30.0 km/h |
| `bus-109` | `MH-19-PR-4321` | `route-105` | Nashik (`STP-NSK`) | 45.0 km/h |
| `bus-110` | `MH-19-ST-6789` | `route-105` | Bhusawal (`STP-BSL`) | 34.0 km/h |
| `bus-111` | `MH-28-UV-1122` | `route-103` | Akola (`STP-AKL`) | 31.0 km/h |
| `bus-112` | `MH-28-WX-3344` | `route-106` | Akola (`STP-AKL`) | 36.0 km/h |
| `bus-113` | `MH-28-YZ-5566` | `route-106` | Karanja (`STP-KAR`) | 27.0 km/h |
| `bus-114` | `MH-28-AB-7788` | `route-107` | Murtizapur (`STP-MRT`) | 29.0 km/h |
| `bus-115` | `MH-28-CD-9900` | `route-108` | Akola (`STP-AKL`) | 33.0 km/h |
| `bus-116` | `MH-28-EF-2244` | `route-108` | Malkapur (`STP-MLK`) | 40.0 km/h |

The current bus fixture set supports positive ETA tests, but it does not contain stale buses, buses with zero speed, occupancy, or live telemetry. The ETA endpoint uses Haversine distance between the fixed bus coordinate and requested stop coordinate.

## Sign-in

Development-only phone OTP endpoints are available under `/api/v1/public/auth/`. OTP delivery is through the backend console when `DEBUG=True`; this is a demo identity, not production authentication. Guests can still browse transit data.

## Local API test examples

Start the backend using the setup instructions in `document.md`, then run these PowerShell examples:

```powershell
$base = 'http://127.0.0.1:8000/api/v1/public'

# List demo routes
Invoke-RestMethod "$base/routes/"

# Find routes from Akola to Shegaon
Invoke-RestMethod "$base/routes/?origin_stop_id=STP-AKL&destination_stop_id=STP-SHG"

# Get ordered stops and calculated fares for the Pune route
Invoke-RestMethod "$base/routes/route-102/"

# List demo buses assigned to route-102 and their current stops
Invoke-RestMethod "$base/buses/live/?route_id=route-102"

# List only route-102 buses that have not passed Shegaon
Invoke-RestMethod "$base/buses/live/?route_id=route-102&destination_stop_id=STP-SHG"

# Get a demo ETA for bus-101 to Pune
Invoke-RestMethod "$base/buses/bus-101/eta/?stop_id=STP-PUN"

# Find the Murtizapur-to-Karanja route connection
Invoke-RestMethod "$base/routes/?origin_stop_id=STP-MRT&destination_stop_id=STP-KAR"
```

Run the backend tests with:

```powershell
python manage.py test transit.tests
```

## Test environment notes

- The backend uses no persistent database for application records. Route, stop, bus, and fare data comes from Python fixtures.
- Transit data endpoints are read-only. The development OTP flow has POST endpoints and creates a demo session; it is not suitable for production accounts or sensitive data.
- All transit API data is labelled `demo`. Do not treat coordinates, fares, or ETAs as real service information.
- The 2026-11-27 review found no actionable issue in the isolated commuter API/auth flow or web/Expo clients. This does not make the static fixture data live or official.
- Do not add actual card IDs, personal phone numbers, credentials, or other private data to this file.
