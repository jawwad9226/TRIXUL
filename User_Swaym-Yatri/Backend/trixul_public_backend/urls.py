from django.urls import include, path

urlpatterns = [
    path("api/v1/public/", include("transit.urls")),
]
