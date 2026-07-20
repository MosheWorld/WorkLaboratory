import math
from threading import RLock

from ..domain.contracts import VectorRepository
from ..domain.models import EmbeddingRecord, SearchMatch


class InMemoryVectorRepository(VectorRepository):
    """Thread-safe vector storage with exact cosine search."""

    def __init__(self) -> None:
        self._records: dict[str, EmbeddingRecord] = {}
        self._lock = RLock()

    def add(self, record: EmbeddingRecord) -> EmbeddingRecord:
        with self._lock:
            self._records[record.id] = record
        return record

    def list(self) -> tuple[EmbeddingRecord, ...]:
        with self._lock:
            return tuple(self._records.values())

    def get(self, embedding_id: str) -> EmbeddingRecord | None:
        with self._lock:
            return self._records.get(embedding_id)

    @staticmethod
    def _cosine_similarity(
        left_vector: tuple[float, ...],
        right_vector: tuple[float, ...],
    ) -> float:
        dot_product = sum(
            left_coordinate * right_coordinate
            for left_coordinate, right_coordinate in zip(left_vector, right_vector)
        )
        left_magnitude = math.sqrt(sum(coordinate * coordinate for coordinate in left_vector))
        right_magnitude = math.sqrt(sum(coordinate * coordinate for coordinate in right_vector))
        if not left_magnitude or not right_magnitude:
            return 0.0
        return dot_product / (left_magnitude * right_magnitude)

    def search(
        self,
        query_vector: tuple[float, ...],
        result_limit: int,
    ) -> tuple[SearchMatch, ...]:
        search_matches = [
            SearchMatch(
                embedding_record,
                self._cosine_similarity(query_vector, embedding_record.vector),
            )
            for embedding_record in self.list()
        ]
        search_matches.sort(key=lambda search_match: search_match.similarity, reverse=True)
        return tuple(search_matches[:result_limit])

    def delete(self, embedding_id: str) -> bool:
        with self._lock:
            return self._records.pop(embedding_id, None) is not None

    def clear(self) -> None:
        with self._lock:
            self._records.clear()
