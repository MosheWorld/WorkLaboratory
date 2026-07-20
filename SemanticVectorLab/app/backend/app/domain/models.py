from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal


EmbeddingKind = Literal["text", "image"]


class EmbeddingContent(ABC):
    """The source content represented by an embedding vector."""

    @property
    @abstractmethod
    def kind(self) -> EmbeddingKind: ...

    @property
    @abstractmethod
    def label(self) -> str: ...

    @property
    def image_content(self) -> ImageEmbeddingContent | None:
        """Return image data when this content supports image delivery."""

        return None


@dataclass(frozen=True, slots=True)
class TextEmbeddingContent(EmbeddingContent):
    text: str

    @property
    def kind(self) -> EmbeddingKind:
        return "text"

    @property
    def label(self) -> str:
        return self.text


@dataclass(frozen=True, slots=True)
class ImageEmbeddingContent(EmbeddingContent):
    file_name: str
    display_name: str
    media_type: str
    data: bytes
    width: int
    height: int

    @property
    def kind(self) -> EmbeddingKind:
        return "image"

    @property
    def label(self) -> str:
        return self.display_name

    @property
    def image_content(self) -> ImageEmbeddingContent:
        return self


@dataclass(frozen=True, slots=True)
class EmbeddingRecord:
    id: str
    content: EmbeddingContent
    vector: tuple[float, ...]


@dataclass(frozen=True, slots=True)
class SearchMatch:
    record: EmbeddingRecord
    similarity: float


@dataclass(frozen=True, slots=True)
class ProjectionPoint:
    record: EmbeddingRecord
    position: tuple[float, float, float]


@dataclass(frozen=True, slots=True)
class ProjectionAlgorithmMetadata:
    key: str
    label: str
    description: str
