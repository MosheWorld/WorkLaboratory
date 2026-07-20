import math
import unittest
from io import BytesIO

from PIL import Image

from app.db.in_memory_repository import InMemoryVectorRepository
from app.domain.contracts import MultimodalEmbeddingProvider
from app.domain.models import EmbeddingRecord, ImageEmbeddingContent, TextEmbeddingContent
from app.services.embedding_service import EmbeddingService
from app.services.pca_projection_algorithm import PcaProjectionAlgorithm
from app.services.pillow_image_processing_service import PillowImageProcessingService
from app.services.projection_service_registry import ProjectionServiceRegistry
from app.services.umap_projection_algorithm import UmapProjectionAlgorithm


class StubEmbeddingProvider(MultimodalEmbeddingProvider):
    @property
    def dimensions(self) -> int:
        return 3

    @property
    def name(self) -> str:
        return "Test embedding provider"

    def embed_text(self, text: str) -> tuple[float, ...]:
        normalized_text = text.lower()
        if "cat" in normalized_text or "kitten" in normalized_text:
            return (1.0, 0.0, 0.0)
        if "python" in normalized_text or "code" in normalized_text:
            return (0.0, 1.0, 0.0)
        return (0.0, 0.0, 1.0)

    def embed_image(self, image_data: bytes) -> tuple[float, ...]:
        return (1.0, 0.0, 0.0)


class EmbeddingProviderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        try:
            from app.providers.sentence_transformer_embedding_provider import (
                SentenceTransformerMultimodalEmbeddingProvider,
            )
        except ModuleNotFoundError as error:
            raise unittest.SkipTest("sentence-transformers is not installed") from error
        cls.embedding_provider = SentenceTransformerMultimodalEmbeddingProvider(
            model_name="sentence-transformers/clip-ViT-B-32",
        )

    def test_embedding_is_deterministic_normalized_and_has_expected_dimensions(self) -> None:
        first_vector = self.embedding_provider.embed_text("A curious cat")
        second_vector = self.embedding_provider.embed_text("A curious cat")

        self.assertEqual(first_vector, second_vector)
        self.assertEqual(len(first_vector), 512)
        self.assertAlmostEqual(
            math.sqrt(sum(value * value for value in first_vector)),
            1.0,
            places=5,
        )

    def test_empty_text_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            self.embedding_provider.embed_text("   ")

    def test_image_embedding_is_normalized_and_uses_the_shared_dimensions(self) -> None:
        image_buffer = BytesIO()
        Image.new("RGB", (48, 32), color=(70, 130, 210)).save(image_buffer, format="PNG")

        image_vector = self.embedding_provider.embed_image(image_buffer.getvalue())

        self.assertEqual(len(image_vector), self.embedding_provider.dimensions)
        self.assertAlmostEqual(
            math.sqrt(sum(value * value for value in image_vector)),
            1.0,
            places=5,
        )


class VectorRepositoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.vector_repository = InMemoryVectorRepository()

    def test_search_orders_records_by_cosine_similarity(self) -> None:
        closest_record = EmbeddingRecord("closest", TextEmbeddingContent("Closest"), (1.0, 0.0))
        distant_record = EmbeddingRecord("distant", TextEmbeddingContent("Distant"), (0.0, 1.0))
        self.vector_repository.add(distant_record)
        self.vector_repository.add(closest_record)

        search_results = self.vector_repository.search((1.0, 0.0), result_limit=2)

        self.assertEqual([result.record.id for result in search_results], ["closest", "distant"])
        self.assertAlmostEqual(search_results[0].similarity, 1.0)

    def test_delete_removes_only_the_requested_record(self) -> None:
        retained_record = EmbeddingRecord("keep", TextEmbeddingContent("Keep"), (1.0, 0.0))
        removed_record = EmbeddingRecord("remove", TextEmbeddingContent("Remove"), (0.0, 1.0))
        self.vector_repository.add(retained_record)
        self.vector_repository.add(removed_record)

        self.assertTrue(self.vector_repository.delete(removed_record.id))
        self.assertEqual(self.vector_repository.list(), (retained_record,))
        self.assertFalse(self.vector_repository.delete(removed_record.id))


class EmbeddingWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.embedding_service = EmbeddingService(
            embedding_provider=StubEmbeddingProvider(),
            vector_repository=InMemoryVectorRepository(),
            projection_service=ProjectionServiceRegistry(
                algorithms=(PcaProjectionAlgorithm(),),
                default_algorithm_key="pca",
            ),
            image_processing_service=PillowImageProcessingService(),
        )

    def test_semantically_related_animal_text_ranks_above_technology_text(self) -> None:
        animal_record = self.embedding_service.add_text("A happy cat sits by the window")
        self.embedding_service.add_text("Python code processes a dataset")

        search_results = self.embedding_service.search("A kitten is a joyful pet", result_limit=2)

        self.assertEqual(search_results[0].record.id, animal_record.id)

    def test_text_content_is_normalized_and_does_not_expose_image_data(self) -> None:
        text_record = self.embedding_service.add_text("  A   carefully spaced   thought  ")

        self.assertEqual(text_record.content.label, "A carefully spaced thought")
        self.assertIsNone(text_record.content.image_content)
        self.assertIsNone(self.embedding_service.get_image(text_record.id))

    def test_service_exposes_provider_metadata(self) -> None:
        self.assertEqual(self.embedding_service.dimensions, 3)
        self.assertEqual(self.embedding_service.encoder_name, "Test embedding provider")

    def test_projection_returns_one_bounded_3d_point_per_record(self) -> None:
        self.embedding_service.add_text("Ocean waves on the beach")
        self.embedding_service.add_text("Forest trail in the mountains")
        self.embedding_service.add_text("Coffee and fresh bread")

        projection_points = self.embedding_service.project()

        self.assertEqual(len(projection_points), 3)
        self.assertTrue(all(len(point.position) == 3 for point in projection_points))
        self.assertTrue(
            all(abs(coordinate) <= 4.2 for point in projection_points for coordinate in point.position)
        )

    def test_reset_replaces_collection_with_default_texts(self) -> None:
        self.embedding_service.add_text("A temporary custom vector")

        reset_records = self.embedding_service.reset(("First default", "Second default"))

        self.assertEqual(
            [record.content.label for record in reset_records],
            ["First default", "Second default"],
        )
        self.assertEqual(self.embedding_service.list(), reset_records)

    def test_image_and_text_are_searchable_in_the_same_vector_space(self) -> None:
        image_buffer = BytesIO()
        Image.new("RGB", (40, 30), color=(220, 180, 120)).save(image_buffer, format="PNG")
        image_record = self.embedding_service.add_image(
            "cat.png",
            "A cat in sunlight",
            image_buffer.getvalue(),
        )

        search_results = self.embedding_service.search("A happy kitten", result_limit=1)

        self.assertEqual(search_results[0].record.id, image_record.id)
        self.assertIsInstance(image_record.content, ImageEmbeddingContent)
        self.assertEqual(self.embedding_service.get_image(image_record.id), image_record.content)


class ProjectionAlgorithmTests(unittest.TestCase):
    def setUp(self) -> None:
        self.records = tuple(
            EmbeddingRecord(
                str(record_index),
                TextEmbeddingContent(f"Record {record_index}"),
                tuple(
                    1.0 if dimension_index == record_index % 6 else record_index / 100.0
                    for dimension_index in range(6)
                ),
            )
            for record_index in range(12)
        )
        self.projection_service = ProjectionServiceRegistry(
            algorithms=(
                PcaProjectionAlgorithm(),
                UmapProjectionAlgorithm(),
            ),
            default_algorithm_key="pca",
        )

    def test_registry_exposes_only_the_supported_algorithms(self) -> None:
        self.assertEqual(
            [(algorithm.key, algorithm.label) for algorithm in self.projection_service.algorithms],
            [("pca", "PCA"), ("umap", "UMAP")],
        )
        self.assertEqual(self.projection_service.default_algorithm_key, "pca")

    def test_every_algorithm_returns_bounded_3d_points(self) -> None:
        for algorithm in self.projection_service.algorithms:
            with self.subTest(algorithm=algorithm.key):
                projection_points = self.projection_service.project(
                    self.records,
                    algorithm.key,
                )
                self.assertEqual(len(projection_points), len(self.records))
                self.assertTrue(all(len(point.position) == 3 for point in projection_points))
                self.assertTrue(
                    all(
                        abs(coordinate) <= 4.2
                        for point in projection_points
                        for coordinate in point.position
                    )
                )

    def test_unknown_algorithm_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "unknown projection algorithm"):
            self.projection_service.project(self.records, "not-real")


class ImageProcessingTests(unittest.TestCase):
    def test_uploaded_image_is_resized_and_normalized_for_safe_preview(self) -> None:
        image_buffer = BytesIO()
        Image.new("RGBA", (2_000, 1_000), color=(40, 90, 160, 128)).save(
            image_buffer,
            format="PNG",
        )

        content = PillowImageProcessingService().process(
            "../unsafe/example.png",
            "  Blue   landscape  ",
            image_buffer.getvalue(),
        )

        self.assertEqual(content.file_name, "example.png")
        self.assertEqual(content.label, "Blue landscape")
        self.assertEqual((content.width, content.height), (1_600, 800))
        self.assertEqual(content.media_type, "image/png")


if __name__ == "__main__":
    unittest.main()
