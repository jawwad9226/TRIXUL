from unittest.mock import patch

from django.test import SimpleTestCase
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
            "/api/v1/public/auth/csrf/",
            "/api/v1/public/auth/otp/request/",
            "/api/v1/public/auth/otp/verify/",
            "/api/v1/public/auth/session/",
            "/api/v1/public/auth/session/refresh/",
            "/api/v1/public/auth/logout/",
        ):
            with self.subTest(path=path):
                self.assertEqual(client.get(path).status_code, 404)
