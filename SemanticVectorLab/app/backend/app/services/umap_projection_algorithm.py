import numpy as np
from umap import UMAP

from ..domain.models import ProjectionAlgorithmMetadata
from .normalized_projection_algorithm import NormalizedProjectionAlgorithm
from .projection_math import principal_component_projection


class UmapProjectionAlgorithm(NormalizedProjectionAlgorithm):
    """Preserves local cosine neighborhoods with deterministic settings."""

    metadata = ProjectionAlgorithmMetadata(
        key="umap",
        label="UMAP",
        description="Best for nearby semantic neighborhoods and mixed text-image clusters.",
    )

    def _project_matrix(
        self,
        embedding_matrix: np.ndarray,
        component_count: int,
    ) -> np.ndarray:
        record_count = embedding_matrix.shape[0]
        if record_count < 5:
            return principal_component_projection(embedding_matrix, component_count)

        return UMAP(
            n_components=component_count,
            n_neighbors=min(10, record_count - 1),
            min_dist=0.18,
            metric="cosine",
            init="random",
            random_state=42,
            transform_seed=42,
            n_jobs=1,
        ).fit_transform(embedding_matrix)
