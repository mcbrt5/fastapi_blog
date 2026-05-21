from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

templates = Jinja2Templates(directory="templates")

router = APIRouter()


@router.get("/account", include_in_schema=False)
async def account_page(request: Request):
    """Render the account page."""
    return templates.TemplateResponse(
        request,
        "account.html",
        {"title": "Account"},
    )
