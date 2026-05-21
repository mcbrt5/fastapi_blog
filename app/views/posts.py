from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.templating import Jinja2Templates
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import app.models as models
from app.config import settings
from app.database import get_db

templates = Jinja2Templates(directory="templates")

router = APIRouter()


@router.get("/", include_in_schema=False, name="home")
@router.get("/posts", include_in_schema=False, name="posts")
async def home(request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    """
    Render the home page with the latest posts.

    Args:
        request (Request): Incoming request.
        db (Annotated[AsyncSession, Depends(get_db)]): Database session.

    Returns:
        Response: Template response containing the posts.

    """
    count_result = await db.execute(select(func.count(models.Post.id)))  # pylint: disable=not-callable
    total = count_result.scalar() or 0

    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.author))
        .order_by(models.Post.date_posted.desc())
        .limit(settings.posts_per_page),
    )
    posts_list = result.scalars().all()

    has_more = len(posts_list) < total

    return templates.TemplateResponse(
        request,
        "home.html",
        {
            "posts": posts_list,
            "title": "Home",
            "limit": settings.posts_per_page,
            "has_more": has_more,
        },
    )


@router.get("/posts/{post_id}", include_in_schema=False)
async def post_page(
    request: Request, post_id: int, db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Render a post detail page.

    Args:
        request (Request): Incoming HTTP request object.
        post_id (int): The ID of the post to retrieve.
        db (Annotated[AsyncSession, Depends): Database session dependency.

    Raises:
        HTTPException: Raised when post with given ID is not found.

    Returns:
        TemplateResponse: Rendered post detail template with post data.

    """
    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.author))
        .where(models.Post.id == post_id)
    )
    post = result.scalars().first()
    if post:
        title = post.title[:50]
        return templates.TemplateResponse(
            request, "post.html", {"post": post, "title": title}
        )
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)


@router.get("/users/{user_id}/posts", include_in_schema=False, name="user_posts")
async def user_posts_page(
    request: Request,
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Render a user's posts page.

    Args:
        request (Request): Incoming request.
        user_id (int): ID of the user.
        db (Annotated[AsyncSession, Depends(get_db)]): Database session.

    Returns:
        Response: Template response containing the user's posts.

    """
    result = await db.execute(select(models.User).where(models.User.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.author))
        .where(models.Post.user_id == user_id)
        .order_by(models.Post.date_posted.desc()),
    )
    posts_list = result.scalars().all()

    return templates.TemplateResponse(
        request,
        "user_posts.html",
        {"posts": posts_list, "user": user, "title": f"{user.username}'s Posts"},
    )


@router.get("/search", include_in_schema=False)
async def search_page(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    q: str | None = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = settings.posts_per_page,
):
    posts_list = []
    total = 0

    if q:
        search_filter = or_(
            models.Post.title.ilike(f"%{q}%"),
            models.Post.content.ilike(f"%{q}%"),
        )
        count_result = await db.execute(
            select(func.count()).select_from(models.Post).where(search_filter)
        )
        total = count_result.scalar() or 0

        result = await db.execute(
            select(models.Post)
            .options(selectinload(models.Post.author))
            .where(search_filter)
            .order_by(models.Post.date_posted.desc())
            .offset(skip)
            .limit(limit)
        )
        posts_list = result.scalars().all()

    has_prev = skip > 0
    has_next = skip + limit < total

    return templates.TemplateResponse(
        request,
        "search.html",
        {
            "posts": posts_list,
            "total": total,
            "q": q,
            "skip": skip,
            "limit": limit,
            "has_prev": has_prev,
            "has_next": has_next,
            "title": f"Search: {q}" if q else "Search",
        },
    )


@router.get("/tags/{tag_name}", include_in_schema=False)
async def tag_page(
    request: Request,
    tag_name: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = settings.posts_per_page,
):
    tag_result = await db.execute(select(models.Tag).where(models.Tag.name == tag_name))
    tag = tag_result.scalars().first()

    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    search_filter = models.Post.tags.any(models.Tag.name == tag_name)

    count_result = await db.execute(
        select(func.count()).select_from(models.Post).where(search_filter)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(models.Post)
        .options(
            selectinload(models.Post.author),
            selectinload(models.Post.tags),
        )
        .where(search_filter)
        .order_by(models.Post.date_posted.desc())
        .offset(skip)
        .limit(limit)
    )
    posts_list = result.scalars().all()

    has_prev = skip > 0
    has_next = skip + limit < total

    return templates.TemplateResponse(
        request,
        "tag.html",
        {
            "posts": posts_list,
            "tag": tag,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_prev": has_prev,
            "has_next": has_next,
            "title": f"#{tag_name}",
        },
    )
