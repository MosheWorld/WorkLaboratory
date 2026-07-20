"use client";

import {
  ArrowRight,
  Braces,
  Check,
  Eraser,
  Info,
  LoaderCircle,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../api-client/client";
import type {
  EmbeddingRecord,
  LabState,
  ProjectionAlgorithmKey,
  SearchMatch,
} from "../api-client/contracts";
import { CreateEmbeddingPanel } from "../components/create-embedding-panel";
import { RecordThumbnail } from "../components/record-thumbnail";

const EmbeddingScene = dynamic(
  () => import("../components/embedding-scene").then((module) => module.EmbeddingScene),
  { ssr: false },
);

const EMPTY_STATE: LabState = {
  count: 0,
  dimensions: 512,
  encoder: "sentence-transformers/clip-ViT-B-32",
  projection_algorithm: "pca",
  projection_algorithms: [
    { key: "pca", label: "PCA", description: "Preserves broad global variance." },
  ],
  records: [],
  points: [],
};

type Operation = "add" | "search" | "clear" | "reset";

function messageFromError(reason: unknown, fallbackMessage: string) {
  return reason instanceof Error ? reason.message : fallbackMessage;
}

function similarityLabel(score: number) {
  if (score > 0.72) return "Very close";
  if (score > 0.42) return "Related";
  if (score > 0.16) return "Faint link";
  return "Distant";
}

export default function Home() {
  const [labState, setLabState] = useState<LabState>(EMPTY_STATE);
  const [searchQuery, setSearchQuery] = useState("");
  const [neighborCount, setNeighborCount] = useState(5);
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [projectionAlgorithm, setProjectionAlgorithm] = useState<ProjectionAlgorithmKey>("pca");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isProjectionLoading, setIsProjectionLoading] = useState(false);
  const [activeOperation, setActiveOperation] = useState<Operation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshLabState = useCallback(async () => {
    setIsProjectionLoading(true);
    try {
      const nextState = await api.state(projectionAlgorithm);
      setLabState(nextState);
      setSelectedId((current) =>
        nextState.records.some((record) => record.id === current)
          ? current
          : nextState.records[0]?.id ?? null,
      );
    } finally {
      setIsProjectionLoading(false);
    }
  }, [projectionAlgorithm]);

  useEffect(() => {
    // Initial data loading is the external synchronization this effect owns.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshLabState()
      .catch(() => setErrorMessage("The learning engine is offline. Start the Python backend, then refresh."))
      .finally(() => setIsInitialLoading(false));
  }, [refreshLabState]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function runOperation<Result>(
    operation: Operation,
    fallbackErrorMessage: string,
    task: () => Promise<Result>,
  ): Promise<Result | undefined> {
    setActiveOperation(operation);
    setErrorMessage(null);
    try {
      return await task();
    } catch (reason) {
      setErrorMessage(messageFromError(reason, fallbackErrorMessage));
      return undefined;
    } finally {
      setActiveOperation(null);
    }
  }

  async function addEmbedding(
    createRecord: () => Promise<EmbeddingRecord>,
    successMessage: string,
    fallbackErrorMessage: string,
  ) {
    const succeeded = await runOperation("add", fallbackErrorMessage, async () => {
      const record = await createRecord();
      await refreshLabState();
      setSelectedId(record.id);
      setSuccessMessage(successMessage);
      return true;
    });
    return succeeded ?? false;
  }

  async function handleAddText(text: string) {
    if (!text.trim()) return false;
    return addEmbedding(
      () => api.add(text),
      "Text vector added to local memory",
      "Could not create an embedding",
    );
  }

  async function handleAddImage(file: File, label: string) {
    return addEmbedding(
      () => api.addImage(file, label),
      "Image vector added to the shared semantic space",
      "Could not create an image embedding",
    );
  }

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    await runOperation("search", "Search failed", async () => {
      const nextMatches = await api.search(
        searchQuery,
        Math.min(neighborCount, Math.max(1, labState.count)),
      );
      setSearchResults(nextMatches);
      setSelectedId(nextMatches[0]?.id ?? null);
    });
  }

  async function handleClear() {
    if (!window.confirm("Clear every vector from this in-memory collection?")) return;
    await runOperation("clear", "Could not clear memory", async () => {
      await api.clear();
      setLabState({
        ...EMPTY_STATE,
        encoder: labState.encoder,
        dimensions: labState.dimensions,
        projection_algorithm: projectionAlgorithm,
        projection_algorithms: labState.projection_algorithms,
      });
      setSelectedId(null);
      setSearchResults([]);
      setSuccessMessage("Memory cleared");
    });
  }

  async function handleResetDefaults() {
    if (!window.confirm("Replace this collection with the original default vectors?")) return;
    await runOperation("reset", "Could not restore default vectors", async () => {
      await api.resetDefaults();
      setSearchResults([]);
      await refreshLabState();
      setSuccessMessage("Default vectors restored");
    });
  }

  async function handleDelete(recordId: string, recordText: string) {
    if (!window.confirm(`Remove “${recordText}” from the collection?`)) return;
    setDeletingId(recordId);
    setErrorMessage(null);
    try {
      await api.remove(recordId);
      setSearchResults((currentResults) => currentResults.filter((result) => result.id !== recordId));
      await refreshLabState();
      setSuccessMessage("Vector removed");
    } catch (reason) {
      setErrorMessage(messageFromError(reason, "Could not remove vector"));
    } finally {
      setDeletingId(null);
    }
  }

  const activeProjection = labState.projection_algorithms.find(
    (algorithm) => algorithm.key === projectionAlgorithm,
  ) ?? EMPTY_STATE.projection_algorithms[0];

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Embedding Lab home">
          <span className="brand-mark"><Braces size={18} /></span>
          <span>EMBEDDING LAB</span>
        </a>
        <div className="topbar-actions">
          <button className="button button-ghost" onClick={handleClear} disabled={activeOperation !== null || !labState.count}>
            {activeOperation === "clear" ? <LoaderCircle className="spin" size={15} /> : <Eraser size={15} />} Clear Vectors
          </button>
          <button className="button button-ghost" onClick={handleResetDefaults} disabled={activeOperation !== null}>
            {activeOperation === "reset" ? <LoaderCircle className="spin" size={15} /> : <RotateCcw size={15} />} Reset Default Vectors
          </button>
        </div>
      </header>

      <section className="intro" id="top">
        <div className="eyebrow"><Sparkles size={14} /> EMBEDDING PLAYGROUND</div>
        <h1>Map meaning.<br /><em>See the invisible.</em></h1>
        <p>
          Turn language and images into one shared vector space, then search across both and orbit their hidden geometry.
        </p>
        <div className="stats-line" aria-label="Collection statistics">
          <span><strong>{labState.count}</strong> vectors stored</span>
          <span><strong>{labState.dimensions}D</strong> source space</span>
          <span><strong>3D</strong> {activeProjection.label} projection</span>
        </div>
      </section>

      {errorMessage && <div className="alert"><Info size={17} /> {errorMessage}</div>}

      <section className="lab-layout" aria-label="Embedding lab">
        <div className="control-column">
          <CreateEmbeddingPanel
            dimensions={labState.dimensions}
            disabled={activeOperation !== null}
            isAdding={activeOperation === "add"}
            onAddText={handleAddText}
            onAddImage={handleAddImage}
          />

          <article className="panel action-panel">
            <div className="step-label"><span>02</span> COMPARE</div>
            <div className="panel-heading">
              <div>
                <h2>Search by meaning</h2>
                <p>Cosine similarity ranks the closest ideas—not exact words.</p>
              </div>
              <Search size={20} />
            </div>
            <form onSubmit={handleSearch}>
              <label htmlFor="search-text">Semantic query</label>
              <div className="search-row">
                <input
                  id="search-text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Find ideas about animals..."
                />
                <button className="icon-button" aria-label="Search" disabled={!searchQuery.trim() || activeOperation !== null || !labState.count}>
                  {activeOperation === "search" ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
                </button>
              </div>
              <div className="range-row">
                <label htmlFor="top-k">Neighbors <strong>{neighborCount}</strong></label>
                <input id="top-k" type="range" min="1" max="10" value={neighborCount} onChange={(event) => setNeighborCount(Number(event.target.value))} />
              </div>
            </form>

            <div className="results" aria-live="polite">
              {searchResults.length ? searchResults.map((searchResult, resultIndex) => (
                <button
                  key={searchResult.id}
                  className={`result-row ${selectedId === searchResult.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(searchResult.id)}
                >
                  <span className="rank">{String(resultIndex + 1).padStart(2, "0")}</span>
                  <RecordThumbnail record={searchResult} className="result-thumbnail" />
                  <span className="result-copy">
                    <span>{searchResult.label}</span>
                    <span className="similarity-track"><span style={{ width: `${Math.max(2, searchResult.similarity * 100)}%` }} /></span>
                  </span>
                  <span className="score"><strong>{Math.round(searchResult.similarity * 100)}%</strong>{similarityLabel(searchResult.similarity)}</span>
                </button>
              )) : (
                <div className="empty-results">Run a query to reveal its nearest neighbors.</div>
              )}
            </div>
          </article>
        </div>

        <article className="visual-panel">
          <div className="visual-heading">
            <div>
              <div className="step-label inverse"><span>03</span> EXPLORE</div>
              <h2>Semantic space</h2>
            </div>
            <div className="visual-tools">
              <label className="projection-control" htmlFor="projection-algorithm">
                <span>Projection</span>
                <span className="projection-select-shell">
                  <select
                    id="projection-algorithm"
                    value={projectionAlgorithm}
                    onChange={(event) => setProjectionAlgorithm(event.target.value as ProjectionAlgorithmKey)}
                    disabled={isProjectionLoading}
                  >
                    {labState.projection_algorithms.map((algorithm) => (
                      <option key={algorithm.key} value={algorithm.key}>{algorithm.label}</option>
                    ))}
                  </select>
                  {isProjectionLoading && <LoaderCircle className="spin" size={13} aria-hidden="true" />}
                </span>
              </label>
              <div className="legend"><span className="dot active" /> Selected <span className="dot related" /> Neighbor <span className="dot" /> Stored</div>
            </div>
          </div>
          {isInitialLoading || isProjectionLoading ? (
            <div className="scene-loading"><LoaderCircle className="spin" /> Computing {activeProjection.label} projection...</div>
          ) : labState.points.length ? (
            <EmbeddingScene points={labState.points} selectedId={selectedId} matches={searchResults} onSelect={setSelectedId} />
          ) : (
            <div className="scene-empty"><Sparkles size={26} /><strong>Your space is empty</strong><span>Create a vector to place the first point.</span></div>
          )}
          <div className="projection-note">
            <Info size={14} /> <span><strong>{activeProjection.label}</strong> compresses {labState.dimensions} dimensions into three. {activeProjection.description}</span>
          </div>
        </article>
      </section>

      <section className="collection-section">
        <div className="section-title compact">
          <div><span className="step-label"><span>04</span> MEMORY</span><h2>Your collection</h2></div>
          <span className="collection-count">{labState.count} LOCAL RECORDS · TEXT + IMAGE</span>
        </div>
        <div className="collection-list">
          {labState.records.map((embeddingRecord, recordIndex) => (
            <div key={embeddingRecord.id} className={`collection-row ${selectedId === embeddingRecord.id ? "selected" : ""}`}>
              <button className="collection-select" onClick={() => setSelectedId(embeddingRecord.id)}>
                <span className="collection-index">{String(recordIndex + 1).padStart(2, "0")}</span>
                <RecordThumbnail record={embeddingRecord} className="collection-thumbnail" />
                <span className="collection-text">{embeddingRecord.label}</span>
                <span className="collection-meta">{embeddingRecord.kind.toUpperCase()} · {embeddingRecord.vector.length}D <ArrowRight size={14} /></span>
              </button>
              <button
                className="collection-delete"
                onClick={() => handleDelete(embeddingRecord.id, embeddingRecord.label)}
                disabled={deletingId === embeddingRecord.id}
                aria-label={`Remove ${embeddingRecord.label}`}
              >
                {deletingId === embeddingRecord.id ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
          {!labState.records.length && <div className="collection-empty">No vectors in memory yet.</div>}
        </div>
      </section>

      <footer>
        <span>EMBEDDING LAB · EDUCATIONAL VECTOR PLAYGROUND</span>
        <span>{labState.encoder} · cross-modal cosine search · in-memory only</span>
      </footer>

      {successMessage && <div className="toast"><Check size={16} /> {successMessage}</div>}
    </main>
  );
}
