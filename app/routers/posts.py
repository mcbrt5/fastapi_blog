from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import app.models as models
from app.auth import CurrentUser
from app.config import settings
from app.database import get_db
from app.schemas import PaginatedPostsResponse, PostCreate, PostResponse, PostUpdate

router = APIRouter()


@router.get("", response_model=PaginatedPostsResponse)
async def get_posts(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = settings.posts_per_page,
    search: Annotated[str | None, Query(max_length=100)] = None,
    tag: Annotated[str | None, Query(max_length=50)] = None,
):
    query = select(models.Post).options(
        selectinload(models.Post.author),
        selectinload(models.Post.tags),
    )
    count_query = select(func.count()).select_from(models.Post)

    if search:
        search_filter = or_(
            models.Post.title.ilike(f"%{search}%"),
            models.Post.content.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if tag:
        tag_filter = models.Post.tags.any(models.Tag.name == tag)
        query = query.where(tag_filter)
        count_query = count_query.where(tag_filter)

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    result = await db.execute(
        query.order_by(models.Post.date_posted.desc()).offset(skip).limit(limit),
    )
    posts = result.scalars().all()

    has_more = skip + len(posts) < total

    return PaginatedPostsResponse(
        posts=[PostResponse.model_validate(post) for post in posts],
        total=total,
        skip=skip,
        limit=limit,
        has_more=has_more,
    )


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post: PostCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if len(post.tag_ids) > settings.max_tags_per_post:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.max_tags_per_post} tags per post allowed",
        )

    new_post = models.Post(
        title=post.title,
        content=post.content,
        user_id=current_user.id,
        tags=[],  # initialize empty list to avoid lazy load
    )
    db.add(new_post)
    await db.flush()

    if post.tag_ids:
        result = await db.execute(
            select(models.Tag).where(models.Tag.id.in_(post.tag_ids))
        )
        tags = result.scalars().all()
        if len(tags) != len(post.tag_ids):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One or more tags not found",
            )
        new_post.tags = tags

    await db.commit()
    await db.refresh(new_post, attribute_names=["author", "tags"])
    return new_post


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(models.Post)
        .options(
            selectinload(models.Post.author),
            selectinload(models.Post.tags),
        )
        .where(models.Post.id == post_id)
    )
    post = result.scalars().first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post does not exist"
        )

    return post


@router.put("/{post_id}", response_model=PostResponse)
async def update_post_full(
    post_id: int,
    post_data: PostCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.tags))
        .where(models.Post.id == post_id)
    )
    post = result.scalars().first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post does not exist"
        )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post",
        )

    if len(post_data.tag_ids) > settings.max_tags_per_post:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {settings.max_tags_per_post} tags per post allowed",
        )

    post.title = post_data.title
    post.content = post_data.content

    tag_result = await db.execute(
        select(models.Tag).where(models.Tag.id.in_(post_data.tag_ids))
    )
    post.tags = tag_result.scalars().all()

    await db.commit()
    await db.refresh(post, attribute_names=["author", "tags"])
    return post


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post_partial(
    post_id: int,
    post_data: PostUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(
        select(models.Post)
        .options(selectinload(models.Post.tags))
        .where(models.Post.id == post_id)
    )
    post = result.scalars().first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post does not exist"
        )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this post",
        )

    update_data = post_data.model_dump(exclude_unset=True)

    if "tag_ids" in update_data:
        tag_ids = update_data.pop("tag_ids")
        if len(tag_ids) > settings.max_tags_per_post:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum {settings.max_tags_per_post} tags per post allowed",
            )
        tag_result = await db.execute(
            select(models.Tag).where(models.Tag.id.in_(tag_ids))
        )
        post.tags = tag_result.scalars().all()

    for field, value in update_data.items():
        setattr(post, field, value)

    await db.commit()
    await db.refresh(post, attribute_names=["author", "tags"])
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    result = await db.execute(select(models.Post).where(models.Post.id == post_id))
    post = result.scalars().first()

    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Post does not exist"
        )

    if post.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this post",
        )

    await db.delete(post)
    await db.commit()
