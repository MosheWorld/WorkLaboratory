from abc import ABC, abstractmethod
from collections.abc import Iterable

from .models import (
    EmbeddingRecord,
    ImageEmbeddingContent,
    ProjectionAlgorithmMetadata,
    ProjectionPoint,
    SearchMatch,
)


class EmbeddingProvider(ABC):
    @property
    @abstractmethod
    def dimensions(self) -> int: ...

    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def embed_text(self, text: str) -> tuple[float, ...]: ...


class MultimodalEmbeddingProvider(EmbeddingProvider):
    """Embeds text and images into one comparable vector space."""

    @abstractmethod
    def embed_image(self, image_data: bytes) -> tuple[float, ...]: ...


class ImageProcessingService(ABC):
    @abstractmethod
    def process(
        self,
        file_name: str,
        display_name: str | None,
        image_data: bytes,
    ) -> ImageEmbeddingContent: ...


class VectorRepository(ABC):
    @abstractmethod
    def add(self, record: EmbeddingRecord) -> EmbeddingRecord: ...

    @abstractmethod
    def list(self) -> tuple[EmbeddingRecord, ...]: ...

    @abstractmethod
    def get(self, embedding_id: str) -> EmbeddingRecord | None: ...

    @abstractmethod
    def search(self, query_vector: tuple[float, ...], result_limit: int) -> tuple[SearchMatch, ...]: ...

    @abstractmethod
    def delete(self, embedding_id: str) -> bool: ...

    @abstractmethod
    def clear(self) -> None: ...


class ProjectionAlgorithm(ABC):
    @property
    @abstractmethod
    def metadata(self) -> ProjectionAlgorithmMetadata: ...

    @property
    def key(self) -> str:
        return self.metadata.key

    @property
    def label(self) -> str:
        return self.metadata.label

    @property
    def description(self) -> str:
        return self.metadata.description

    @abstractmethod
    def project(self, records: Iterable[EmbeddingRecord]) -> tuple[ProjectionPoint, ...]: ...


class ProjectionService(ABC):
    @property
    @abstractmethod
    def algorithms(self) -> tuple[ProjectionAlgorithm, ...]: ...

    @property
    @abstractmethod
    def default_algorithm_key(self) -> str: ...

    @abstractmethod
    def project(
        self,
        records: Iterable[EmbeddingRecord],
        algorithm_key: str | None = None,
    ) -> tuple[ProjectionPoint, ...]: ...
