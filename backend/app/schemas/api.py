from pydantic import BaseModel, EmailStr, Field


class SessionRestoreIn(BaseModel):
    player_id: str


class CreateRunIn(BaseModel):
    loadout: dict = Field(default_factory=dict)


class InputMessage(BaseModel):
    type: str = "input"
    seq: int = 0
    thrust: bool = False
    rotate: int = 0


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class AuthOut(BaseModel):
    player_id: str
    email: str | None = None
    display_name: str | None = None
    message: str


class CraftIn(BaseModel):
    recipe_id: str
