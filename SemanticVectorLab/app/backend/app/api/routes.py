from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response

from ..core.default_embeddings import DEFAULT_EMBEDDING_TEXTS
from ..domain.models import EmbeddingRecord
from ..services.embedding_service import EmbeddingService
from .schemas import (
    EmbeddingOutput,
    ProjectionAlgorithmOutput,
    ProjectionOutput,
    SearchInput,
    SearchOutput,
    StateOutput,
    TextInput,
)


def create_router(embedding_service: EmbeddingService) -> APIRouter:
    router = APIRouter(prefix="/api")

    def record_metadata(embedding_record: EmbeddingRecord) -> dict[str, object]:
        image_content = embedding_record.content.image_content
        return {
            "id": embedding_record.id,
            "kind": embedding_record.content.kind,
            "label": embedding_record.content.label,
            "image_url": f"/api/images/{embedding_record.id}" if image_content else None,
            "image_width": image_content.width if image_content else None,
            "image_height": image_content.height if image_content else None,
        }

    def serialize_embedding_record(embedding_record: EmbeddingRecord) -> EmbeddingOutput:
        return EmbeddingOutput(
            **record_metadata(embedding_record),
            vector=list(embedding_record.vector),
        )

    @router.get("/state", response_model=StateOutput)
    def get_state(
        projection: str | None = Query(default=None, max_length=40),
    ) -> StateOutput:
        stored_records = embedding_service.list()
        active_projection = projection or embedding_service.default_projection_algorithm_key
        try:
            projection_points = embedding_service.project(active_projection)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return StateOutput(
            count=len(stored_records),
            dimensions=embedding_service.dimensions,
            encoder=embedding_service.encoder_name,
            projection_algorithm=active_projection,
            projection_algorithms=[
                ProjectionAlgorithmOutput(
                    key=algorithm.key,
                    label=algorithm.label,
                    description=algorithm.description,
                )
                for algorithm in embedding_service.projection_algorithms
            ],
            records=[
                serialize_embedding_record(embedding_record)
                for embedding_record in stored_records
            ],
            points=[
                ProjectionOutput(
                    **record_metadata(projection_point.record),
                    position=projection_point.position,
                )
                for projection_point in projection_points
            ],
        )

    @router.post("/embeddings", response_model=EmbeddingOutput, status_code=status.HTTP_201_CREATED)
    def add_embedding(payload: TextInput) -> EmbeddingOutput:
        try:
            return serialize_embedding_record(embedding_service.add_text(payload.text))
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @router.post(
        "/image-embeddings",
        response_model=EmbeddingOutput,
        status_code=status.HTTP_201_CREATED,
    )
    async def add_image_embedding(
        image: UploadFile = File(...),
        label: str | None = Form(default=None, max_length=160),
    ) -> EmbeddingOutput:
        try:
            return serialize_embedding_record(
                embedding_service.add_image(
                    file_name=image.filename or "uploaded-image",
                    display_name=label,
                    image_data=await image.read(),
                )
            )
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @router.get("/images/{embedding_id}", response_class=Response)
    def get_image(embedding_id: str) -> Response:
        image_content = embedding_service.get_image(embedding_id)
        if image_content is None:
            raise HTTPException(status_code=404, detail="Image embedding not found")
        return Response(
            content=image_content.data,
            media_type=image_content.media_type,
            headers={"Cache-Control": "private, max-age=3600"},
        )

    @router.post("/search", response_model=list[SearchOutput])
    def search(payload: SearchInput) -> list[SearchOutput]:
        try:
            search_results = embedding_service.search(payload.query, payload.top_k)
            return [
                SearchOutput(
                    **record_metadata(search_result.record),
                    similarity=search_result.similarity,
                )
                for search_result in search_results
            ]
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    @router.delete("/embeddings", status_code=status.HTTP_204_NO_CONTENT)
    def clear_embeddings() -> None:
        embedding_service.clear()

    @router.post("/embeddings/reset", status_code=status.HTTP_204_NO_CONTENT)
    def reset_embeddings() -> None:
        embedding_service.reset(DEFAULT_EMBEDDING_TEXTS)

    @router.delete("/embeddings/{embedding_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_embedding(embedding_id: str) -> None:
        if not embedding_service.delete(embedding_id):
            raise HTTPException(status_code=404, detail="Embedding not found")

    return router
