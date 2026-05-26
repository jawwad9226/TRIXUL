from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from .models import Employee

class EmployeeJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        from rest_framework_simplejwt.settings import api_settings
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        try:
            user = Employee.objects.get(emp_id=user_id)
        except Employee.DoesNotExist:
            raise AuthenticationFailed("User not found", code="user_not_found")

        return user

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        employee_instance = self.get_user(validated_token)
        
        # Explicitly returning (employee_instance, token) as mandated
        return (employee_instance, validated_token)
