# Embedding Lab

Embedding Lab is a local multimodal vector playground for embedding, searching, and visualizing text and images with PCA or UMAP.

## Requirements

- Docker Desktop, or Docker Engine with the Compose plugin
- A running Docker daemon
- Internet access for the first build

## Run the project

From the repository root, build and start the frontend and backend:

```bash
docker compose up --build -d
```

The first build downloads CPU-only PyTorch and the CLIP model, so it can take several minutes. Check the container status with:

```bash
docker compose ps
```

Open:

- Application: http://localhost:3000
- API documentation: http://localhost:8000/docs

After changing code, rebuild with the same start command:

```bash
docker compose up --build -d
```

## Optional port configuration

Copy `.env.example` to `.env`, then change either port if needed:

```env
FRONTEND_PORT=3000
BACKEND_PORT=8000
```

## Stop the project

```bash
docker compose down
```
