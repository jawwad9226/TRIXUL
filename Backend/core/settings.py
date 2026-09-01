import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file (safe to call even if file doesn't exist)
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

# ============================================================
# SECURITY — All secrets loaded from environment variables
# ============================================================
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-change-me-before-deploying-to-production'
)

# Development: True | Production: False
# Set DEBUG=False in your .env file for production.
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True

# ============================================================
# INSTALLED APPS
# ============================================================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.gis',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'core',
]

# ============================================================
# MIDDLEWARE
# ============================================================
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ============================================================
# DATABASE — All credentials from .env
# ============================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('DB_NAME', 'trixul_db'),
        'USER': os.environ.get('DB_USER', 'trixul_admin'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# ============================================================
# CACHE — Redis in production, local memory as dev fallback
# ============================================================
CACHE_BACKEND = os.environ.get(
    'CACHE_BACKEND',
    'django.core.cache.backends.locmem.LocMemCache'  # Safe fallback (no Redis needed locally)
)
CACHE_URL = os.environ.get('CACHE_URL', 'redis://127.0.0.1:6379/1')

if CACHE_BACKEND == 'django.core.cache.backends.redis.RedisCache':
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.redis.RedisCache',
            'LOCATION': CACHE_URL,
        }
    }
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'trixul-local',
        }
    }

# ============================================================
# LOCALIZATION
# ============================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================
# REST FRAMEWORK & JWT
# ============================================================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'core.authentication.EmployeeJWTAuthentication',
    ),
}

SIMPLE_JWT = {
    # Use emp_id as the token identity field
    'USER_ID_FIELD': 'emp_id',
    'USER_ID_CLAIM': 'emp_id',
}
