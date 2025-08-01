from flask import Blueprint

# Create API blueprint
api_bp = Blueprint('api', __name__)

# Import API routes
from . import health
# from . import users
# from . import auth

# Add your API route imports here as you create them 