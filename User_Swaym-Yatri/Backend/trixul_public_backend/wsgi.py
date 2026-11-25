import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "trixul_public_backend.settings")

application = get_wsgi_application()
