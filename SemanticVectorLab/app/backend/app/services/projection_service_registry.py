from collections.abc import Iterable

from ..domain.contracts import ProjectionAlgorithm, ProjectionService
from ..domain.models import EmbeddingRecord, ProjectionPoint


class ProjectionServiceRegistry(ProjectionService):
    """Selects a projection strategy without coupling workflows to implementations."""

    def __init__(
        self,
        algorithms: Iterable[ProjectionAlgorithm],
        default_algorithm_key: str,
    ) -> None:
        self._algorithms = tuple(algorithms)
        self._algorithms_by_key = {algorithm.key: algorithm for algorithm in self._algorithms}
        if not self._algorithms:
            raise ValueError("at least one projection algorithm is required")
        if len(self._algorithms_by_key) != len(self._algorithms):
            raise ValueError("projection algorithm keys must be unique")
        if default_algorithm_key not in self._algorithms_by_key:
            raise ValueError("default projection algorithm is not registered")
        self._default_algorithm_key = default_algorithm_key

    @property
    def algorithms(self) -> tuple[ProjectionAlgorithm, ...]:
        return self._algorithms

    @property
    def default_algorithm_key(self) -> str:
        return self._default_algorithm_key

    def project(
        self,
        records: Iterable[EmbeddingRecord],
        algorithm_key: str | None = None,
    ) -> tuple[ProjectionPoint, ...]:
        selected_key = algorithm_key or self._default_algorithm_key
        selected_algorithm = self._algorithms_by_key.get(selected_key)
        if selected_algorithm is None:
            available_keys = ", ".join(self._algorithms_by_key)
            raise ValueError(
                f"unknown projection algorithm {selected_key!r}; choose one of: {available_keys}"
            )
        return selected_algorithm.project(records)
