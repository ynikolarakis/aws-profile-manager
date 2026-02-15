"""Pydantic models for API request/response bodies."""

from pydantic import BaseModel


# --- Requests ---

class ActivateRequest(BaseModel):
    name: str

class RunCommandRequest(BaseModel):
    cmd: str

class BulkRunRequest(BaseModel):
    profiles: list[str]
    cmd: str

class DeleteProfileRequest(BaseModel):
    name: str

class ValidateNameRequest(BaseModel):
    name: str

class SetProfileCategoryRequest(BaseModel):
    profile: str
    cat_id: str

class ToggleCollapsedRequest(BaseModel):
    cid: str

class AddCategoryRequest(BaseModel):
    name: str
    color: str

class EditCategoryRequest(BaseModel):
    cid: str
    name: str
    color: str

class DeleteCategoryRequest(BaseModel):
    cid: str

class AddFavoriteRequest(BaseModel):
    label: str
    cmd: str

class RemoveFavoriteRequest(BaseModel):
    cmd: str

class SetThemeRequest(BaseModel):
    theme: str

class DiscoverServicesRequest(BaseModel):
    profile: str | None = None

class GetCostRequest(BaseModel):
    profile: str
    year: int = 2025
    month: int = 1


# --- Responses ---

class OkResponse(BaseModel):
    ok: bool = True

class ErrorResponse(BaseModel):
    error: str

class ValidateNameResponse(BaseModel):
    result: str | None

class CategoryCreatedResponse(BaseModel):
    ok: bool = True
    id: str

class ToggleCollapsedResponse(BaseModel):
    ok: bool = True
    collapsed: bool

class ImportResponse(BaseModel):
    ok: bool = True
    count: int
