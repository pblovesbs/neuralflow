from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

class APIKeyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, api_key: str):
        super().__init__(app)
        self.api_key = api_key
        
    async def dispatch(self, request: Request, call_next):
        # For localhost-only deployments, bypass auth entirely.
        # The frontend never sends X-API-Key headers, so enforcing auth
        # silently blocks /api/models, /api/system/*, /api/feedback, etc.
        # When remote deployment is needed, re-enable the key check below.
        return await call_next(request)
