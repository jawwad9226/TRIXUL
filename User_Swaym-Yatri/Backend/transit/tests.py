import re
from unittest.mock import patch

from django.conf import settings
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIClient

from . import mock_data, services


class PublicTransitApiTests(SimpleTestCase):
    def test_route_detail_contains_demo_stops_and_calculated_fares(self):
        response = APIClient().get("/api/v1/public/routes/route-101/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data_source"], "demo")
        self.assertEqual(len(response.data["route_stops"]), 2)
        self.assertEqual(response.data["fares"][0]["fare"], "73.75")
        self.assertNotIn("conductor_name", response.data)
        self.assertNotIn("cash_revenue", response.data)

    def test_route_search_matches_stops_in_forward_order(self):
        client = APIClient()
        matching = client.get(
            "/api/v1/public/routes/",
            {"origin_stop_id": "STP-AKL", "destination_stop_id": "STP-SHG"},
        )
        reverse = client.get(
            "/api/v1/public/routes/",
            {"origin_stop_id": "STP-SHG", "destination_stop_id": "STP-AKL"},
        )

        self.assertIn("route-101", [route["route_id"] for route in matching.data["routes"]])
        self.assertNotIn("route-101", [route["route_id"] for route in reverse.data["routes"]])

    def test_route_search_validates_paired_origin_and_destination(self):
        response = APIClient().get(
            "/api/v1/public/routes/",
            {"origin_stop_id": "STP-AKL"},
        )

        self.assertEqual(response.status_code, 400)

    def test_stop_search_returns_matching_demo_stops(self):
        response = APIClient().get("/api/v1/public/stops/", {"q": "Akola"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data_source"], "demo")
        self.assertEqual([stop["stop_id"] for stop in response.data["stops"]], ["STP-AKL"])

    def test_live_endpoint_returns_only_buses_for_selected_route(self):
        response = APIClient().get(
            "/api/v1/public/buses/live/",
            {"route_id": "route-102"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data_source"], "demo")
        self.assertEqual(
            [bus["bus_id"] for bus in response.data["buses"]],
            ["bus-101", "bus-104"],
        )
        self.assertEqual(response.data["buses"][0]["data_source"], "demo")
        self.assertFalse(response.data["buses"][0]["is_stale"])
        self.assertEqual(response.data["buses"][0]["current_stop_id"], "STP-SHG")
        self.assertEqual(response.data["buses"][0]["current_stop_name"], "Shegaon Bus Stand")

    def test_live_bus_filter_keeps_buses_behind_source_and_through_destination(self):
        response = APIClient().get(
            "/api/v1/public/buses/live/",
            {
                "route_id": "route-102",
                "destination_stop_id": "STP-PUN",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [bus["bus_id"] for bus in response.data["buses"]],
            ["bus-101", "bus-104"],
        )

    def test_live_bus_filter_excludes_buses_that_crossed_destination(self):
        with patch.dict(mock_data.BUSES["bus-101"], {"current_stop_id": "STP-PUN"}):
            response = APIClient().get(
                "/api/v1/public/buses/live/",
                {
                    "route_id": "route-102",
                    "destination_stop_id": "STP-BSL",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [bus["bus_id"] for bus in response.data["buses"]],
            ["bus-104"],
        )

    def test_route_search_includes_active_bus_count_and_new_route_connections(self):
        response = APIClient().get(
            "/api/v1/public/routes/",
            {"origin_stop_id": "STP-MRT", "destination_stop_id": "STP-KAR"},
        )

        self.assertEqual(response.status_code, 200)
        route = next(item for item in response.data["routes"] if item["route_id"] == "route-106")
        self.assertEqual(route["active_bus_count"], 2)

    def test_route_bus_count_uses_destination_without_excluding_buses_behind_source(self):
        response = APIClient().get(
            "/api/v1/public/routes/",
            {
                "origin_stop_id": "STP-BSL",
                "destination_stop_id": "STP-PUN",
            },
        )

        route = next(item for item in response.data["routes"] if item["route_id"] == "route-102")
        self.assertEqual(route["active_bus_count"], 2)

    def test_every_demo_bus_current_stop_belongs_to_its_route(self):
        self.assertEqual(len(mock_data.BUSES), 16)
        for bus in mock_data.BUSES.values():
            with self.subTest(bus_id=bus["bus_id"]):
                route_stop_ids = {
                    item["stop_id"]
                    for item in mock_data.ROUTES[bus["route_id"]]["route_stops"]
                }
                self.assertIn(bus["current_stop_id"], route_stop_ids)

    def test_eta_calculates_from_mock_coordinates_and_speed(self):
        result, response_status = services.get_bus_eta("bus-101", "STP-PUN")

        self.assertEqual(response_status, 200)
        self.assertGreater(result["distance_km"], 0)
        self.assertGreater(result["eta_minutes"], 0)
        self.assertEqual(result["data_source"], "demo")

    def test_eta_rejects_stop_outside_active_route(self):
        result, response_status = services.get_bus_eta("bus-101", "STP-KHG")

        self.assertEqual(response_status, 404)
        self.assertIn("error", result)

    def test_eta_for_unknown_bus_returns_not_found(self):
        result, response_status = services.get_bus_eta("bus-unknown", "STP-AKL")

        self.assertEqual(response_status, 404)
        self.assertIn("error", result)

    def test_operational_endpoints_are_not_routed(self):
        client = APIClient()
        for path in (
            "/admin/",
            "/api/v1/admin/fleet/",
            "/api/v1/admin/shifts/",
            "/api/v1/ticketing/issue/",
            "/api/v1/public/auth/session/refresh/",
        ):
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 404)


@override_settings(DEBUG=True, SECRET_KEY="test-only-secret")
class PhoneOtpAuthTests(SimpleTestCase):
    phone_number = "+15555550123"

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def request_code(self, client=None, phone_number=None):
        return (client or APIClient()).post(
            "/api/v1/public/auth/otp/request/",
            {"phone_number": phone_number or self.phone_number},
            format="json",
        )

    def logged_code(self, phone_number=None):
        with self.assertLogs("transit.auth_services", level="WARNING") as logs:
            response = self.request_code(phone_number=phone_number)
        code = re.search(r": (\d{6})$", logs.output[0]).group(1)
        return response, code

    def test_request_prints_otp_only_to_backend_log(self):
        response, code = self.logged_code()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["delivery_mode"], "console")
        self.assertEqual(response.data["expires_in"], 60)
        self.assertNotIn(code, str(response.data))
        self.assertNotIn(self.phone_number, str(response.data))

    def test_request_rejects_non_international_phone_number(self):
        response = self.request_code(phone_number="5551234")

        self.assertEqual(response.status_code, 400)

    def test_otp_verification_creates_http_only_session_and_is_one_time(self):
        client = APIClient()
        csrf = client.get("/api/v1/public/auth/csrf/")
        self.assertEqual(csrf.status_code, 200)
        with self.assertLogs("transit.auth_services", level="WARNING") as logs:
            requested = self.request_code(client=client)
        code = re.search(r": (\d{6})$", logs.output[0]).group(1)

        verified = client.post(
            "/api/v1/public/auth/otp/verify/",
            {"phone_number": self.phone_number, "code": code},
            format="json",
        )

        self.assertEqual(requested.status_code, 200)
        self.assertEqual(verified.status_code, 200)
        self.assertTrue(verified.data["authenticated"])
        self.assertTrue(verified.cookies[settings.SESSION_COOKIE_NAME]["httponly"])
        self.assertTrue(client.get("/api/v1/public/auth/session/").data["authenticated"])
        reused = client.post(
            "/api/v1/public/auth/otp/verify/",
            {"phone_number": self.phone_number, "code": code},
            format="json",
        )
        self.assertEqual(reused.status_code, 400)

    def test_expired_otp_is_rejected(self):
        with patch("transit.auth_services.time.time", return_value=1000):
            _, code = self.logged_code()
        with patch("transit.auth_services.time.time", return_value=1061):
            response = APIClient().post(
                "/api/v1/public/auth/otp/verify/",
                {"phone_number": self.phone_number, "code": code},
                format="json",
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", response.data["detail"].lower())

    def test_five_wrong_attempts_invalidate_otp(self):
        _, code = self.logged_code()
        client = APIClient()

        for attempt in range(5):
            response = client.post(
                "/api/v1/public/auth/otp/verify/",
                {"phone_number": self.phone_number, "code": "000000" if code != "000000" else "000001"},
                format="json",
            )
            self.assertEqual(response.status_code, 429 if attempt == 4 else 400)

        rejected = client.post(
            "/api/v1/public/auth/otp/verify/",
            {"phone_number": self.phone_number, "code": code},
            format="json",
        )
        self.assertEqual(rejected.status_code, 400)

    def test_phone_and_ip_request_limits(self):
        with self.assertLogs("transit.auth_services", level="WARNING"):
            for _ in range(3):
                response = self.request_code()
                self.assertEqual(response.status_code, 200)
        self.assertEqual(self.request_code().status_code, 429)

        cache.clear()
        with self.assertLogs("transit.auth_services", level="WARNING"):
            for index in range(5):
                phone = f"+15555550{100 + index:03d}"
                self.assertEqual(self.request_code(phone_number=phone).status_code, 200)
        self.assertEqual(
            self.request_code(phone_number="+15555550199").status_code,
            429,
        )

    def test_otp_is_disabled_outside_debug_mode(self):
        with override_settings(DEBUG=False):
            response = self.request_code()

        self.assertEqual(response.status_code, 503)
        self.assertNotIn("otp", str(response.data).lower())

    def test_logout_clears_session(self):
        client = APIClient()
        _, code = self.logged_code()
        client.post(
            "/api/v1/public/auth/otp/verify/",
            {"phone_number": self.phone_number, "code": code},
            format="json",
        )

        response = client.post("/api/v1/public/auth/logout/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(client.get("/api/v1/public/auth/session/").data["authenticated"])

    def test_cors_preflight_allows_expo_web_with_credentials(self):
        response = APIClient().options(
            "/api/v1/public/auth/csrf/",
            HTTP_ORIGIN="http://localhost:8081",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Access-Control-Allow-Origin"],
            "http://localhost:8081",
        )
        self.assertEqual(response["Access-Control-Allow-Credentials"], "true")
