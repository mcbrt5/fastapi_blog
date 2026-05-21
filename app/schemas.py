"""Pydantic schemas for the FastAPI blog application."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    """
    Base user schema with common fields.

    Args:
        BaseModel: Pydantic base model class.

    """

    username: str = Field(min_length=1, max_length=50)
    email: EmailStr = Field(max_length=120)


class UserCreate(UserBase):
    """
    User schema for creating a new user.

    Args:
        UserBase: Base user schema with common fields.

    """

    password: str = Field(min_length=8)


class UserPublic(BaseModel):
    """
    User schema for public response.

    Args:
        BaseModel: Pydantic base model class.

    """

    model_config = ConfigDict(
        from_attributes=True
    )  # allows pydantic to read from sql model

    id: int
    username: str
    image_file: str | None
    image_path: str


class UserPrivate(UserPublic):
    """
    User schema for private response.

    Args:
        UserPublic: Public user schema with common fields.

    """

    model_config = ConfigDict(
        from_attributes=True
    )  # allows pydantic to read from sql model

    email: EmailStr


class UserUpdate(BaseModel):
    """
    User schema for updating user information.

    Args:
        BaseModel: Pydantic base model class.

    """

    username: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=120)


class Token(BaseModel):
    """
    Token schema for authentication.

    Args:
        BaseModel: Pydantic base model class.

    """

    access_token: str
    token_type: str


class TagBase(BaseModel):
    """Base tag schema."""

    name: str = Field(min_length=1, max_length=50)


class TagCreate(TagBase):
    """Schema for creating a tag."""


class TagResponse(TagBase):
    """Schema for tag response."""

    model_config = ConfigDict(from_attributes=True)
    id: int


class PostBase(BaseModel):
    """
    Base post schema with common fields.

    Args:
        BaseModel: Pydantic base model class.

    """

    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1)


class PostCreate(PostBase):
    """Post schema for creating a new post."""

    tag_ids: list[int] = Field(default=[])


class PostUpdate(BaseModel):
    """Update post schema."""

    title: str | None = Field(default=None, min_length=1, max_length=100)
    content: str | None = Field(default=None, min_length=1)
    tag_ids: list[int] | None = Field(default=None)


class PostResponse(PostBase):
    """Post schema for response."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    date_posted: datetime
    author: UserPublic
    tags: list[TagResponse] = []


class PaginatedPostsResponse(BaseModel):
    """
    Paginated posts response schema.

    Args:
        BaseModel: Pydantic base model class.

    """

    posts: list[PostResponse]
    total: int
    skip: int
    limit: int
    has_more: bool


class ForgotPasswordRequest(BaseModel):
    """
    Forgot password request schema.

    Args:
        BaseModel: Pydantic base model class.

    """

    email: EmailStr = Field(max_length=120)


class ResetPasswordRequest(BaseModel):
    """
    Reset password request schema.

    Args:
        BaseModel: Pydantic base model class.

    """

    token: str
    new_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    """
    Change password request schema.

    Args:
        BaseModel: Pydantic base model class.

    """

    current_password: str
    new_password: str = Field(min_length=8)
