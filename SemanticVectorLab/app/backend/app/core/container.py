from functools import lru_cache

from .default_embeddings import DEFAULT_EMBEDDING_TEXTS
from ..db.in_memory_repository import InMemoryVectorRepository
from ..providers.sentence_transformer_embedding_provider import (
    SentenceTransformerMultimodalEmbeddingProvider,
)
from ..services.embedding_service import EmbeddingService
from ..services.pca_projection_algorithm import PcaProjectionAlgorithm
from ..services.pillow_image_processing_service import PillowImageProcessingService
from ..services.projection_service_registry import ProjectionServiceRegistry
from ..services.umap_projection_algorithm import UmapProjectionAlgorithm


@lru_cache(maxsize=1)
def get_embedding_service() -> EmbeddingService:
    embedding_service = EmbeddingService(
        embedding_provider=SentenceTransformerMultimodalEmbeddingProvider(
            model_name="sentence-transformers/clip-ViT-B-32",
        ),
        vector_repository=InMemoryVectorRepository(),
        projection_service=ProjectionServiceRegistry(
            algorithms=(
                PcaProjectionAlgorithm(),
                UmapProjectionAlgorithm(),
            ),
            default_algorithm_key="pca",
        ),
        image_processing_service=PillowImageProcessingService(),
    )
    embedding_service.reset(DEFAULT_EMBEDDING_TEXTS)
    return embedding_service
