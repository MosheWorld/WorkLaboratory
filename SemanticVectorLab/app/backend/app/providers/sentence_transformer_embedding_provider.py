from io import BytesIO
from threading import RLock

from PIL import Image
from sentence_transformers import SentenceTransformer

from ..domain.contracts import MultimodalEmbeddingProvider
from ..domain.text import require_normalized_text


class SentenceTransformerMultimodalEmbeddingProvider(MultimodalEmbeddingProvider):
    """Produces normalized image and text embeddings in one CLIP vector space."""

    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model = SentenceTransformer(model_name)
        embedding_dimensions = self._model.get_embedding_dimension()
        if embedding_dimensions is None:
            raise RuntimeError(f"Model {model_name!r} does not expose its embedding dimensions")
        self._dimensions = embedding_dimensions
        self._inference_lock = RLock()

    @property
    def dimensions(self) -> int:
        return self._dimensions

    @property
    def name(self) -> str:
        return self._model_name

    def embed_text(self, text: str) -> tuple[float, ...]:
        return self._encode(require_normalized_text(text))

    def embed_image(self, image_data: bytes) -> tuple[float, ...]:
        with Image.open(BytesIO(image_data)) as source_image:
            rgb_image = source_image.convert("RGB")
            return self._encode(rgb_image)

    def _encode(self, value: str | Image.Image) -> tuple[float, ...]:
        with self._inference_lock:
            embedding_vector = self._model.encode(
                value,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
        return tuple(float(coordinate) for coordinate in embedding_vector)
