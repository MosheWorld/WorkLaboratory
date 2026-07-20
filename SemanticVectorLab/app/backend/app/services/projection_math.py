import numpy as np


def principal_component_projection(
    embedding_matrix: np.ndarray,
    component_count: int,
) -> np.ndarray:
    """Project a matrix onto its strongest orthogonal variance directions."""

    centered_matrix = embedding_matrix - embedding_matrix.mean(axis=0, keepdims=True)
    _, _, principal_directions = np.linalg.svd(centered_matrix, full_matrices=False)
    return centered_matrix @ principal_directions[:component_count].T
