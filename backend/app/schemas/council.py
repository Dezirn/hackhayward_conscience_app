"""HTTP request/response models for POST /council/respond."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class CouncilRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    question: str
    context: Optional[str] = None

    @field_validator("question")
    @classmethod
    def question_not_blank(cls, v: str) -> str:
        s = (v or "").strip()
        if not s:
            raise ValueError("question must not be empty")
        return s

    @field_validator("context")
    @classmethod
    def context_strip(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        t = v.strip()
        return t if t else None


class CouncilAdvisorItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    role: str
    response: str


class CouncilSynthesisBody(BaseModel):
    model_config = ConfigDict(extra="ignore")

    consensus: str
    tension: str
    suggested_next_step: str


class CouncilRespondResponse(BaseModel):
    question: str
    advisors: list[CouncilAdvisorItem]
    synthesis: CouncilSynthesisBody
    used_fallback: bool = False
