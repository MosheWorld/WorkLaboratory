export type RecordKind = "text" | "image";

export type RecordSummary = {
  id: string;
  kind: RecordKind;
  label: string;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
};

export type EmbeddingRecord = RecordSummary & {
  vector: number[];
};

export type ProjectionPoint = RecordSummary & {
  position: [number, number, number];
};

export type SearchMatch = RecordSummary & {
  similarity: number;
};

export type ProjectionAlgorithmKey = "pca" | "umap";

export type ProjectionAlgorithm = {
  key: ProjectionAlgorithmKey;
  label: string;
  description: string;
};

export type LabState = {
  count: number;
  dimensions: number;
  encoder: string;
  projection_algorithm: ProjectionAlgorithmKey;
  projection_algorithms: ProjectionAlgorithm[];
  records: EmbeddingRecord[];
  points: ProjectionPoint[];
};
