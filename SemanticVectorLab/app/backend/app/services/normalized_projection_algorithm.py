from abc import abstractmethod
from collections.abc import Iterable

import numpy as np

from ..domain.contracts import ProjectionAlgorithm
from ..domain.models import EmbeddingRecord, ProjectionPoint


class NormalizedProjectionAlgorithm(ProjectionAlgorithm):
    """Template for projection algorithms rendered in the shared 3D scene."""

    _SCENE_RADIUS = 4.2

    def project(self, records: Iterable[EmbeddingRecord]) -> tuple[ProjectionPoint, ...]:
        embedding_records = tuple(records)
        if not embedding_records:
            return ()

        embedding_matrix = np.asarray(
            [embedding_record.vector for embedding_record in embedding_records],
            dtype=float,
        )
        component_count = min(3, len(embedding_records), embedding_matrix.shape[1])

        if len(embedding_records) == 1:
            projected_coordinates = np.zeros((1, 3), dtype=float)
        else:
            projected_coordinates = np.asarray(
                self._project_matrix(embedding_matrix, component_count),
                dtype=float,
            )
            projected_coordinates = self._pad_to_three_dimensions(projected_coordinates)

        normalized_coordinates = self._normalize_for_scene(projected_coordinates)
        return tuple(
            ProjectionPoint(
                embedding_record,
                tuple(float(coordinate) for coordinate in normalized_coordinates[record_index]),
            )
            for record_index, embedding_record in enumerate(embedding_records)
        )

    @abstractmethod
    def _project_matrix(
        self,
        embedding_matrix: np.ndarray,
        component_count: int,
    ) -> np.ndarray: ...

    @staticmethod
    def _pad_to_three_dimensions(coordinates: np.ndarray) -> np.ndarray:
        if coordinates.ndim == 1:
            coordinates = coordinates.reshape(-1, 1)
        if coordinates.shape[1] >= 3:
            return coordinates[:, :3]
        return np.pad(coordinates, ((0, 0), (0, 3 - coordinates.shape[1])))

    def _normalize_for_scene(self, coordinates: np.ndarray) -> np.ndarray:
        centered_coordinates = coordinates - coordinates.mean(axis=0, keepdims=True)
        maximum_absolute_coordinate = (
            float(np.abs(centered_coordinates).max()) if centered_coordinates.size else 0.0
        )
        if maximum_absolute_coordinate == 0:
            return centered_coordinates
        return centered_coordinates / maximum_absolute_coordinate * self._SCENE_RADIUS
