#!/usr/bin/env python3
"""
scripts/test_all_endpoints.py
Comprehensive End-to-End API Test Suite for TRIXUL.
Tests all ETM Interface endpoints and Admin Command Center endpoints.
"""
import os
import sys
import json
from datetime import datetime, timezone

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django
django.setup()

from rest_framework.test import APIClient
from core.models import Employee, Bus, Stop, Route, Shift, Ticket, Incident

client = APIClient()

def print_header(title):
    print(f"\n{'='*70}\n {title}\n{'='*70}")

def run_test(name, fn):
    try:
        res = fn()
        if res.get("passed"):
            print(f" [PASS] {name} (Status: {res.get('status_code', 200)})")
            return True, res
        else:
            print(f" [FAIL] {name} -> Status: {res.get('status_code')} | Error: {res.get('error') or res.get('data')}")
            return False, res
    except Exception as e:
        print(f" [ERROR] {name} -> {str(e)}")
        return False, {"error": str(e)}

results = []

print_header("TRIXUL COMPREHENSIVE END-TO-END TEST SUITE")

# ─────────────────────────────────────────────────────────────────────────────
# 1. ETM ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
print_header("STAGE 1 & 2: ETM INTERFACE ENDPOINTS")

auth_token = None
refresh_token = None

def test_login():
    global auth_token, refresh_token
    resp = client.post("/api/v1/auth/login/", {"emp_id": "cond-1001"}, format="json")
    if resp.status_code == 200:
        auth_token = resp.data.get("access")
        refresh_token = resp.data.get("refresh")
        return {"passed": bool(auth_token), "status_code": resp.status_code, "data": resp.data}
    return {"passed": False, "status_code": resp.status_code, "error": resp.data}

results.append(("ETM: Conductor Login (POST /api/v1/auth/login/)", *run_test("Conductor Login", test_login)))

def test_token_refresh():
    if not refresh_token:
        return {"passed": False, "error": "No refresh token available"}
    resp = client.post("/api/v1/auth/refresh/", {"refresh": refresh_token}, format="json")
    return {"passed": resp.status_code == 200 and "access" in resp.data, "status_code": resp.status_code}

results.append(("ETM: Token Refresh (POST /api/v1/auth/refresh/)", *run_test("Token Refresh", test_token_refresh)))

def test_route_init():
    resp = client.get("/api/v1/routes/route-102/")
    if resp.status_code == 200:
        data = resp.data
        has_stops = len(data.get("stops", [])) > 0
        has_fares = len(data.get("fares", [])) > 0
        has_yojnas = "mahilaSanman" in data.get("activeYojnas", {})
        return {
            "passed": has_stops and has_fares and has_yojnas,
            "status_code": resp.status_code,
            "stops_count": len(data.get("stops", [])),
            "fares_count": len(data.get("fares", []))
        }
    return {"passed": False, "status_code": resp.status_code, "error": resp.data}

results.append(("ETM: Route Init (GET /api/v1/routes/route-102/)", *run_test("Route Init & Fares Matrix", test_route_init)))

def test_heartbeat():
    payload = {
        "shift_id": "shift-001",
        "latitude": 20.7095,
        "longitude": 76.9981,
        "speed": 45.5,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    resp = client.post("/api/v1/telemetry/heartbeat/", payload, format="json")
    passed = resp.status_code == 200 and resp.data.get("processed") is True
    return {"passed": passed, "status_code": resp.status_code, "data": resp.data}

results.append(("ETM: Telemetry Heartbeat (POST /api/v1/telemetry/heartbeat/)", *run_test("Telemetry Heartbeat (PostGIS ETA)", test_heartbeat)))

def test_issue_ticket_cash():
    payload = {
        "shift_id": "shift-001",
        "source_stop_id": "STP-AKL",
        "dest_stop_id": "STP-SHG",
        "passenger_count": 2,
        "total_fare": "85.00",
        "payment_method": "CASH",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    resp = client.post("/api/v1/ticketing/issue/", payload, format="json")
    passed = resp.status_code == 201 and resp.data.get("status") == "success"
    return {"passed": passed, "status_code": resp.status_code, "ticket_id": resp.data.get("ticket_id")}

results.append(("ETM: Issue Ticket Cash (POST /api/v1/ticketing/issue/)", *run_test("Issue Ticket [Cash]", test_issue_ticket_cash)))

def test_issue_ticket_upi():
    payload = {
        "shift_id": "shift-001",
        "source_stop_id": "STP-AKL",
        "dest_stop_id": "STP-BSL",
        "passenger_count": 1,
        "total_fare": "220.00",
        "payment_method": "UPI",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    resp = client.post("/api/v1/ticketing/issue/", payload, format="json")
    passed = resp.status_code == 201 and resp.data.get("status") == "success"
    return {"passed": passed, "status_code": resp.status_code, "ticket_id": resp.data.get("ticket_id")}

results.append(("ETM: Issue Ticket UPI (POST /api/v1/ticketing/issue/)", *run_test("Issue Ticket [UPI]", test_issue_ticket_upi)))

def test_batch_ticket_sync():
    payload = {
        "shift_id": "shift-001",
        "tickets": [
            {
                "ticket_id": f"OFFLINE-TKT-{int(datetime.now().timestamp())}-1",
                "source_stop_id": "STP-AKL",
                "dest_stop_id": "STP-SHG",
                "passenger_count": 2,
                "total_fare": "85.00",
                "payment_method": "CASH",
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "ticket_id": f"OFFLINE-TKT-{int(datetime.now().timestamp())}-2",
                "source_stop_id": "STP-SHG",
                "dest_stop_id": "STP-MLK",
                "passenger_count": 1,
                "total_fare": "65.00",
                "payment_method": "UPI",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    resp = client.post("/api/v1/sync/batch/", payload, format="json")
    passed = resp.status_code == 201 and resp.data.get("synced_count") == 2
    return {"passed": passed, "status_code": resp.status_code, "synced_count": resp.data.get("synced_count")}

results.append(("ETM: Batch Ingestion API (POST /api/v1/sync/batch/)", *run_test("Offline Ticket Batch Ingestion", test_batch_ticket_sync)))

def test_shift_ticket_summary():
    resp = client.get("/api/v1/ticketing/shift/shift-001/summary/")
    passed = resp.status_code == 200 and "tickets" in resp.data and "total_revenue" in resp.data
    return {
        "passed": passed,
        "status_code": resp.status_code,
        "total_tickets": resp.data.get("total_tickets"),
        "total_revenue": resp.data.get("total_revenue")
    }

results.append(("ETM: Live Shift Summary (GET /api/v1/ticketing/shift/shift-001/summary/)", *run_test("Live Shift Summary & Ticket Audit", test_shift_ticket_summary)))


created_incident_id = None
def test_create_incident_sos():
    global created_incident_id
    payload = {
        "shift_id": "shift-001",
        "severity": "SOS",
        "message": "Highway obstruction near Malkapur bypass. Engine overheating.",
        "latitude": 20.8872,
        "longitude": 76.2023
    }
    resp = client.post("/api/v1/admin/incidents/", payload, format="json")
    passed = resp.status_code == 201 and resp.data.get("status") == "success"
    if passed:
        created_incident_id = resp.data.get("incident_id")
    return {"passed": passed, "status_code": resp.status_code, "incident_id": created_incident_id}

results.append(("ETM: Conductor SOS Report (POST /api/v1/admin/incidents/)", *run_test("Conductor SOS Report", test_create_incident_sos)))

# ─────────────────────────────────────────────────────────────────────────────
# 2. ADMIN COMMAND CENTER ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
print_header("STAGE 3: ADMIN COMMAND CENTER ENDPOINTS")

def test_admin_fleet():
    resp = client.get("/api/v1/admin/fleet/")
    passed = resp.status_code == 200 and "fleet" in resp.data and "ai_alerts" in resp.data
    return {
        "passed": passed,
        "status_code": resp.status_code,
        "fleet_count": len(resp.data.get("fleet", [])),
        "ai_alerts_count": len(resp.data.get("ai_alerts", []))
    }

results.append(("Admin: Live Fleet Telemetry (GET /api/v1/admin/fleet/)", *run_test("Fleet Telemetry & AI Alerts", test_admin_fleet)))

def test_admin_dispatch_options():
    resp = client.get("/api/v1/admin/dispatch-options/")
    data = resp.data
    passed = (
        resp.status_code == 200 and
        len(data.get("conductors", [])) > 0 and
        len(data.get("buses", [])) > 0 and
        len(data.get("routes", [])) > 0
    )
    return {"passed": passed, "status_code": resp.status_code}

results.append(("Admin: Dispatch Options (GET /api/v1/admin/dispatch-options/)", *run_test("Dispatch Options Lookup", test_admin_dispatch_options)))

created_shift_id = None
def test_admin_create_shift():
    global created_shift_id
    payload = {
        "emp_id": "cond-1004",
        "bus_id": "bus-104",
        "route_id": "route-103"
    }
    resp = client.post("/api/v1/admin/shifts/", payload, format="json")
    passed = resp.status_code == 201 and resp.data.get("status") == "success"
    if passed:
        created_shift_id = resp.data.get("shift_id")
    return {"passed": passed, "status_code": resp.status_code, "shift_id": created_shift_id, "error": resp.data}

results.append(("Admin: Create Shift (POST /api/v1/admin/shifts/)", *run_test("Deploy New Shift & Wake ETM", test_admin_create_shift)))

def test_admin_reassign_bus():
    if not created_shift_id:
        return {"passed": False, "error": "No active shift to reassign"}
    payload = {"new_bus_id": "bus-103"}
    resp = client.post(f"/api/v1/admin/shifts/{created_shift_id}/reassign-bus/", payload, format="json")
    passed = resp.status_code == 200 and resp.data.get("status") == "success"
    return {"passed": passed, "status_code": resp.status_code, "message": resp.data.get("message")}

results.append(("Admin: Mid-Shift Bus Swap (POST /api/v1/admin/shifts/<id>/reassign-bus/)", *run_test("Mid-Shift Vehicle Swap", test_admin_reassign_bus)))

def test_admin_close_shift():
    if not created_shift_id:
        return {"passed": False, "error": "No active shift to close"}
    resp = client.post(f"/api/v1/admin/shifts/{created_shift_id}/close/")
    passed = resp.status_code == 200 and resp.data.get("status") == "success"
    return {"passed": passed, "status_code": resp.status_code}

results.append(("Admin: Close Shift (POST /api/v1/admin/shifts/<id>/close/)", *run_test("End Shift Closure", test_admin_close_shift)))

def test_admin_shifts_list():
    resp = client.get("/api/v1/admin/shifts/")
    passed = resp.status_code == 200 and isinstance(resp.data, list) and len(resp.data) > 0
    return {"passed": passed, "status_code": resp.status_code, "shifts_count": len(resp.data)}

results.append(("Admin: List Shifts (GET /api/v1/admin/shifts/)", *run_test("Duty Roster Listing", test_admin_shifts_list)))

def test_admin_revenue():
    resp = client.get("/api/v1/admin/revenue/")
    data = resp.data
    passed = (
        resp.status_code == 200 and
        "total_revenue" in data and
        "cash" in data and
        "upi" in data and
        "per_route" in data and
        "per_conductor" in data
    )
    return {
        "passed": passed,
        "status_code": resp.status_code,
        "total_revenue": data.get("total_revenue"),
        "cash_amount": data.get("cash", {}).get("amount"),
        "upi_amount": data.get("upi", {}).get("amount")
    }

results.append(("Admin: Revenue Breakdown (GET /api/v1/admin/revenue/)", *run_test("Revenue Cash vs UPI Split", test_admin_revenue)))

def test_admin_incidents_list():
    resp = client.get("/api/v1/admin/incidents/")
    passed = resp.status_code == 200 and isinstance(resp.data, list) and len(resp.data) > 0
    return {"passed": passed, "status_code": resp.status_code, "incidents_count": len(resp.data)}

results.append(("Admin: List Incidents (GET /api/v1/admin/incidents/)", *run_test("Incident Triage Queue", test_admin_incidents_list)))

def test_admin_acknowledge_incident():
    target_id = created_incident_id or Incident.objects.filter(status='OPEN').first().incident_id
    resp = client.patch(f"/api/v1/admin/incidents/{target_id}/acknowledge/")
    passed = resp.status_code == 200 and resp.data.get("status") == "success"
    return {"passed": passed, "status_code": resp.status_code, "incident_status": resp.data.get("incident_status")}

results.append(("Admin: Acknowledge Incident (PATCH /api/v1/admin/incidents/<id>/acknowledge/)", *run_test("Acknowledge / Silence SOS", test_admin_acknowledge_incident)))

# ─────────────────────────────────────────────────────────────────────────────
# 3. ROUTE MANAGER & VISUAL MAP BUILDER ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
print_header("STAGE 3: ROUTE MANAGER & VISUAL BUILDER ENDPOINTS")

created_stop_id = None
def test_create_stop():
    global created_stop_id
    payload = {
        "stop_name": "Malkapur Central Bus Stand",
        "stop_id": "STP-MLK-TEST",
        "latitude": 20.8872,
        "longitude": 76.2023
    }
    resp = client.post("/api/v1/admin/stops/", payload, format="json")
    passed = resp.status_code == 201 and resp.data.get("status") == "success"
    if passed:
        created_stop_id = resp.data.get("stop_id")
    return {"passed": passed, "status_code": resp.status_code, "stop_id": created_stop_id}

results.append(("Admin: Create Stop (POST /api/v1/admin/stops/)", *run_test("Map-Click Pin Stop Registration", test_create_stop)))

def test_list_stops():
    resp = client.get("/api/v1/admin/stops/")
    passed = resp.status_code == 200 and isinstance(resp.data, list) and len(resp.data) > 0
    return {"passed": passed, "status_code": resp.status_code, "stops_count": len(resp.data)}

results.append(("Admin: List Stops (GET /api/v1/admin/stops/)", *run_test("Registered Stops Index", test_list_stops)))

def test_create_route():
    import uuid
    route_id = f"route-test-{str(uuid.uuid4().int)[:4]}"
    payload = {
        "route_id": route_id,
        "route_name": "Akola - Malkapur Test Express",
        "base_fare": "12.00",
        "per_km_rate": "1.60",
        "stops": [
            {"stop_id": "STP-AKL", "stop_name": "Akola Bus Stand", "sequence": 1, "distance_km": 0.0, "latitude": 20.7002, "longitude": 77.0022},
            {"stop_id": "STP-SHG", "stop_name": "Shegaon Bus Stand", "sequence": 2, "distance_km": 42.5, "latitude": 20.7932, "longitude": 76.6908},
            {"stop_id": "STP-MLK", "stop_name": "Malkapur Bus Stand", "sequence": 3, "distance_km": 95.6, "latitude": 20.8872, "longitude": 76.2023}
        ]
    }
    resp = client.post("/api/v1/admin/routes/create/", payload, format="json")
    passed = resp.status_code == 201 and resp.data.get("status") == "success"
    return {"passed": passed, "status_code": resp.status_code, "route_id": route_id}

results.append(("Admin: Deploy Route (POST /api/v1/admin/routes/create/)", *run_test("Visual Route Creation & Fare Rule", test_create_route)))

def test_list_routes():
    resp = client.get("/api/v1/admin/routes/")
    passed = resp.status_code == 200 and isinstance(resp.data, list) and len(resp.data) > 0
    return {"passed": passed, "status_code": resp.status_code, "routes_count": len(resp.data)}

results.append(("Admin: List Routes (GET /api/v1/admin/routes/)", *run_test("Route Directory with Stops & Fares", test_list_routes)))

def test_fare_controls():
    # Test GET
    get_resp = client.get("/api/v1/admin/fare-controls/")
    has_rules = get_resp.status_code == 200 and isinstance(get_resp.data, list) and len(get_resp.data) > 0

    # Test POST update (10% midday discount push)
    post_payload = {"route_id": "ALL", "discount_percentage": "10.00"}
    post_resp = client.post("/api/v1/admin/fare-controls/", post_payload, format="json")
    has_updated = post_resp.status_code == 200 and post_resp.data.get("status") == "success"

    return {
        "passed": has_rules and has_updated,
        "status_code": post_resp.status_code,
        "discount_percentage": post_resp.data.get("discount_percentage")
    }

results.append(("Admin: Dynamic Fare Controls (GET & POST /api/v1/admin/fare-controls/)", *run_test("Dynamic Fare Control & 10% Discount Push", test_fare_controls)))

# Maintain initial active shifts so demo/radar state is preserved
from core.models import Shift
Shift.objects.filter(shift_id="shift-001").update(status="Active")
Shift.objects.filter(shift_id="shift-002").update(status="Active")
Shift.objects.filter(shift_id="shift-003").update(status="Active")


# ─────────────────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────────────────
print_header("FINAL TEST SUMMARY")
passed_count = sum(1 for _, p, _ in results if p)
failed_count = len(results) - passed_count

print(f" Total Endpoints Tested: {len(results)}")
print(f" Passed:                 {passed_count}")
print(f" Failed:                 {failed_count}")

if failed_count == 0:
    print("\n >>> ALL API ENDPOINTS FUNCTIONING 100% AS INTENDED! <<<")
else:
    print(f"\n >>> ATTENTION: {failed_count} tests failed. Inspect details above. <<<")

# Output JSON summary for machine parsing
summary_file = os.path.join(BASE_DIR, "scripts", "last_test_results.json")
with open(summary_file, "w") as f:
    json.dump({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total": len(results),
        "passed": passed_count,
        "failed": failed_count,
        "details": [{"name": n, "passed": p, "result": r} for n, p, r in results]
    }, f, indent=2)

sys.exit(0 if failed_count == 0 else 1)
