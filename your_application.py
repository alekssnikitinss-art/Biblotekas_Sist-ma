# Compatibility shim: some deployment instructions/templates mistakenly reference
# 'your_application:app' as the WSGI entrypoint. Export `app` from the real
# application module so imports like `your_application:app` succeed.

from app import app  # re-export the Flask app

__all__ = ["app"]
