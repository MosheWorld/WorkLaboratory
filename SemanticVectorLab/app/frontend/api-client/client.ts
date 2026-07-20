import type {
  EmbeddingRecord,
  LabState,
  ProjectionAlgorithmKey,
  SearchMatch,
} from "./contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type ApiErrorBody = {
  detail?: unknown;
};

async function getErrorMessage(response: Response): Promise<string> {
  const fallbackMessage = `Request failed (${response.status})`;
  const body: ApiErrorBody = await response.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : fallbackMessage;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (typeof init?.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  state: (projectionAlgorithm: ProjectionAlgorithmKey) =>
    request<LabState>(`/state?projection=${encodeURIComponent(projectionAlgorithm)}`),
  add: (text: string) =>
    request<EmbeddingRecord>("/embeddings", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  addImage: (image: File, label: string) => {
    const formData = new FormData();
    formData.append("image", image);
    if (label.trim()) formData.append("label", label.trim());
    return request<EmbeddingRecord>("/image-embeddings", {
      method: "POST",
      body: formData,
    });
  },
  search: (query: string, topK: number) =>
    request<SearchMatch[]>("/search", {
      method: "POST",
      body: JSON.stringify({ query, top_k: topK }),
    }),
  remove: (id: string) => request<void>(`/embeddings/${id}`, { method: "DELETE" }),
  clear: () => request<void>("/embeddings", { method: "DELETE" }),
  resetDefaults: () => request<void>("/embeddings/reset", { method: "POST" }),
};
