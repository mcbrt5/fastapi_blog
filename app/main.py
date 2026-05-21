from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exception_handlers import (
    http_exception_handler,
    request_validation_exception_handler,
)
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.database import engine, get_db
from app.routers import posts as api_posts
from app.routers import users as api_users
from app.views import auth as view_auth
from app.views import posts as view_posts
from app.views import users as view_users

templates = Jinja2Templates(directory="templates")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    Manage application lifespan.

    Args:
        _app (FastAPI): The application instance.

    """
    yield
    # shutdown
    await engine.dispose()


async def add_security_headers(request: Request, call_next):
    """
    Add security headers to all HTTP responses.

    Args:
        request (Request): incoming request.
        call_next (_type_): next request handler.

    Returns:
        _type_: response object.

    """
    response = await call_next(request)

    response.headers["X-Frame-Options"] = "SAMEORIGIN"

    response.headers["X-CONTENT-TYPE-OPTIONS"] = "nosniff"

    if "Referrer-Policy" not in response.headers:
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    if request.url.hostname not in ("localhost", "127.0.0.1"):
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains"
        )

    return response


async def health_check(db: Annotated[AsyncSession, Depends(get_db)]):
    """
    Health check endpoint.

    Args:
        db (Annotated[AsyncSession, Depends[get_db]]): Database session.

    Raises:
        HTTPException: If the database is unavailable.

    Returns:
        dict: Health status.

    """
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        ) from exc
    return {"status": "healthy"}


async def general_http_exception_handler(
    request: Request, exception: StarletteHTTPException
):
    """
    Handle HTTP exceptions for both API and web routes.

    Args:
        request (Request): The incoming request object.
        exception (StarletteHTTPException): The HTTP exception to handle.

    Returns:
        TemplateResponse or JSONResponse: Error response in appropriate format.

    """
    if request.url.path.startswith("/api"):
        return await http_exception_handler(request, exception)

    message = (
        exception.detail or "An error occured. Please check your request and try again."
    )

    return templates.TemplateResponse(
        request,
        "error.html",
        {
            "status_code": exception.status_code,
            "title": exception.status_code,
            "message": message,
        },
        status_code=exception.status_code,
    )


async def validation_exception_handler(
    request: Request, exception: RequestValidationError
):
    """
    Handle validation exceptions for both API and web routes.

    Args:
        request (Request): The incoming request object.
        exception (RequestValidationError): The validation error exception.

    Returns:
        TemplateResponse or JSONResponse: Error response in appropriate format.

    """
    if request.url.path.startswith("/api"):
        return await request_validation_exception_handler(request, exception)

    return templates.TemplateResponse(
        request,
        "error.html",
        {
            "status_code": status.HTTP_422_UNPROCESSABLE_CONTENT,
            "title": status.HTTP_422_UNPROCESSABLE_CONTENT,
            "message": "Invalid request. Please check your input and try again.",
        },
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
    )


def create_app() -> FastAPI:
    """
    Create and configure the FastAPI application.

    Returns:
        FastAPI: The configured FastAPI application instance.

    """
    application = FastAPI(lifespan=lifespan)
    application.mount("/static", StaticFiles(directory="static"), name="static")

    application.middleware("http")(add_security_headers)
    application.get("/health")(health_check)

    # API routes
    application.include_router(api_users.router, prefix="/api/users", tags=["users"])
    application.include_router(api_posts.router, prefix="/api/posts", tags=["posts"])

    # Frontend routes
    application.include_router(view_users.router, prefix="", tags=["users"])
    application.include_router(view_posts.router, prefix="", tags=["posts"])
    application.include_router(view_auth.router, prefix="", tags=["auth"])

    application.add_exception_handler(
        StarletteHTTPException, general_http_exception_handler
    )
    application.add_exception_handler(
        RequestValidationError, validation_exception_handler
    )

    return application


app = create_app()
