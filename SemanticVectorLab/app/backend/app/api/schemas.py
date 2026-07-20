from typing import Literal

from pydantic import BaseModel, Field


class TextInput(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class SearchInput(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=5, ge=1, le=20)


class RecordSummaryOutput(BaseModel):
    id: str
    kind: Literal["text", "image"]
    label: str
    image_url: str | None = None
    image_width: int | None = None
    image_height: int | None = None


class EmbeddingOutput(RecordSummaryOutput):
    vector: list[float]


class SearchOutput(RecordSummaryOutput):
    similarity: float


class ProjectionOutput(RecordSummaryOutput):
    position: tuple[float, float, float]


class ProjectionAlgorithmOutput(BaseModel):
    key: str
    label: str
    description: str


class StateOutput(BaseModel):
    count: int
    dimensions: int
    encoder: str
    projection_algorithm: str
    projection_algorithms: list[ProjectionAlgorithmOutput]
    records: list[EmbeddingOutput]
    points: list[ProjectionOutput]
