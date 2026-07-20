from io import BytesIO
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from ..domain.contracts import ImageProcessingService
from ..domain.models import ImageEmbeddingContent
from ..domain.text import normalize_whitespace


class PillowImageProcessingService(ImageProcessingService):
    """Validates and normalizes uploads before inference and preview delivery."""

    _MAX_FILE_BYTES = 8 * 1024 * 1024
    _MAX_PIXEL_COUNT = 25_000_000
    _MAX_EDGE_LENGTH = 1_600
    _SUPPORTED_FORMATS = frozenset({"JPEG", "PNG", "WEBP"})

    def process(
        self,
        file_name: str,
        display_name: str | None,
        image_data: bytes,
    ) -> ImageEmbeddingContent:
        if not image_data:
            raise ValueError("image cannot be empty")
        if len(image_data) > self._MAX_FILE_BYTES:
            raise ValueError("image must be 8 MB or smaller")

        safe_file_name = Path(file_name or "uploaded-image").name
        safe_display_name = normalize_whitespace(display_name or safe_file_name)[:160]
        if not safe_display_name:
            safe_display_name = "Uploaded image"

        try:
            with Image.open(BytesIO(image_data)) as uploaded_image:
                detected_format = uploaded_image.format
                if detected_format not in self._SUPPORTED_FORMATS:
                    raise ValueError("image must be a JPEG, PNG, or WebP file")
                if uploaded_image.width * uploaded_image.height > self._MAX_PIXEL_COUNT:
                    raise ValueError("image dimensions are too large")

                normalized_image = ImageOps.exif_transpose(uploaded_image)
                normalized_image.thumbnail(
                    (self._MAX_EDGE_LENGTH, self._MAX_EDGE_LENGTH),
                    Image.Resampling.LANCZOS,
                )
                normalized_data, media_type = self._serialize(normalized_image)
                width, height = normalized_image.size
        except (UnidentifiedImageError, OSError) as error:
            raise ValueError("the uploaded file is not a readable image") from error

        return ImageEmbeddingContent(
            file_name=safe_file_name,
            display_name=safe_display_name,
            media_type=media_type,
            data=normalized_data,
            width=width,
            height=height,
        )

    @staticmethod
    def _serialize(image: Image.Image) -> tuple[bytes, str]:
        output = BytesIO()
        has_transparency = image.mode in {"RGBA", "LA"} or (
            image.mode == "P" and "transparency" in image.info
        )
        if has_transparency:
            image.convert("RGBA").save(output, format="PNG", optimize=True)
            return output.getvalue(), "image/png"

        image.convert("RGB").save(output, format="JPEG", quality=88, optimize=True)
        return output.getvalue(), "image/jpeg"
