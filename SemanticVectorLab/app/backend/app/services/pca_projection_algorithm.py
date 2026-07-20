import numpy as np

from ..domain.models import ProjectionAlgorithmMetadata
from .normalized_projection_algorithm import NormalizedProjectionAlgorithm
from .projection_math import principal_component_projection


class PcaProjectionAlgorithm(NormalizedProjectionAlgorithm):
    """Preserves the collection's strongest directions of global variance."""

    metadata = ProjectionAlgorithmMetadata(
        key="pca",
        label="PCA",
        description="Fast and stable. Preserves broad global variance across the collection.",
    )

    def _project_matrix(
        self,
        embedding_matrix: np.ndarray,
        component_count: int,
    ) -> np.ndarray:
        return principal_component_projection(embedding_matrix, component_count)
