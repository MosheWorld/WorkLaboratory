from collections.abc import Iterable
from uuid import uuid4

from ..domain.contracts import (
    ImageProcessingService,
    MultimodalEmbeddingProvider,
    ProjectionAlgorithm,
    ProjectionService,
    VectorRepository,
)
from ..domain.models import (
    EmbeddingContent,
    EmbeddingRecord,
    ImageEmbeddingContent,
    ProjectionPoint,
    SearchMatch,
    TextEmbeddingContent,
)
from ..domain.text import require_normalized_text


class EmbeddingService:
    def __init__(
        self,
        embedding_provider: MultimodalEmbeddingProvider,
        vector_repository: VectorRepository,
        projection_service: ProjectionService,
        image_processing_service: ImageProcessingService,
    ) -> None:
        self._embedding_provider = embedding_provider
        self._vector_repository = vector_repository
        self._projection_service = projection_service
        self._image_processing_service = image_processing_service

    @property
    def dimensions(self) -> int:
        return self._embedding_provider.dimensions

    @property
    def encoder_name(self) -> str:
        return self._embedding_provider.name

    @property
    def projection_algorithms(self) -> tuple[ProjectionAlgorithm, ...]:
        return self._projection_service.algorithms

    @property
    def default_projection_algorithm_key(self) -> str:
        return self._projection_service.default_algorithm_key

    def add_text(self, raw_text: str) -> EmbeddingRecord:
        normalized_text = require_normalized_text(raw_text)
        return self._add_content(
            TextEmbeddingContent(normalized_text),
            self._embedding_provider.embed_text(normalized_text),
        )

    def add_image(
        self,
        file_name: str,
        display_name: str | None,
        image_data: bytes,
    ) -> EmbeddingRecord:
        image_content = self._image_processing_service.process(
            file_name,
            display_name,
            image_data,
        )
        return self._add_content(
            image_content,
            self._embedding_provider.embed_image(image_content.data),
        )

    def _add_content(
        self,
        content: EmbeddingContent,
        vector: tuple[float, ...],
    ) -> EmbeddingRecord:
        return self._vector_repository.add(
            EmbeddingRecord(uuid4().hex[:12], content, vector)
        )

    def list(self) -> tuple[EmbeddingRecord, ...]:
        return self._vector_repository.list()

    def get_image(self, embedding_id: str) -> ImageEmbeddingContent | None:
        embedding_record = self._vector_repository.get(embedding_id)
        return embedding_record.content.image_content if embedding_record else None

    def search(self, query_text: str, result_limit: int) -> tuple[SearchMatch, ...]:
        normalized_query = require_normalized_text(query_text, field_name="query")
        query_vector = self._embedding_provider.embed_text(normalized_query)
        return self._vector_repository.search(query_vector, result_limit)

    def project(self, algorithm_key: str | None = None) -> tuple[ProjectionPoint, ...]:
        return self._projection_service.project(
            self._vector_repository.list(),
            algorithm_key,
        )

    def delete(self, embedding_id: str) -> bool:
        return self._vector_repository.delete(embedding_id)

    def clear(self) -> None:
        self._vector_repository.clear()

    def reset(self, default_texts: Iterable[str]) -> tuple[EmbeddingRecord, ...]:
        self._vector_repository.clear()
        return tuple(self.add_text(default_text) for default_text in default_texts)
