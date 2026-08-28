from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import Employee

class EmployeeJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        """
        Overrides the default behavior to search the TRIXUL Employee table
        instead of the default Django auth.User table.
        """
        try:
            # Extract the employee ID from the token (SimpleJWT defaults to 'user_id' claim)
            user_id = validated_token.get('user_id')
            
            # Find the conductor in our custom database
            user = Employee.objects.get(emp_id=user_id)
            
            # DRF requires the user object to have this property to pass permissions
            user.is_authenticated = True 
            
            return user
        except Employee.DoesNotExist:
            raise AuthenticationFailed('Employee not found in database', code='user_not_found')