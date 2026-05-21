from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import app.models as models
from app.auth import hash_reset_token
from app.config import settings
from app.database import get_db
from app.schemas import TagCreate, TagResponse

router = APIRouter()


def verify_admin_key(x_admin_key: Annotated[str | None, Header()] = None):
    """Verify the admin key header."""
    if not x_admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin key required",
        )
    if hash_reset_token(x_admin_key) != settings.admin_key_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin key",
        )


@router.get("", response_model=list[TagResponse])
async def get_tags(db: Annotated[AsyncSession, Depends(get_db)]):
    """Return all tags."""
    result = await db.execute(select(models.Tag).order_by(models.Tag.name.asc()))
    return result.scalars().all()


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag: TagCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[None, Depends(verify_admin_key)],
):
    """Create a new tag."""
    result = await db.execute(
        select(models.Tag).where(models.Tag.name == tag.name.lower())
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag already exists",
        )

    new_tag = models.Tag(name=tag.name.lower())
    db.add(new_tag)
    await db.commit()
    await db.refresh(new_tag)
    return new_tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[None, Depends(verify_admin_key)],
):
    """Delete a tag."""
    result = await db.execute(select(models.Tag).where(models.Tag.id == tag_id))
    tag = result.scalars().first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tag not found",
        )

    await db.delete(tag)
    await db.commit()
