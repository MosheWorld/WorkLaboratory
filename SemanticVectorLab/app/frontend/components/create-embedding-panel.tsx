"use client";

import Image from "next/image";
import { Database, FileImage, ImagePlus, LoaderCircle, Sparkles, Type } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

type CreateEmbeddingPanelProps = {
  dimensions: number;
  disabled: boolean;
  isAdding: boolean;
  onAddText: (text: string) => Promise<boolean>;
  onAddImage: (file: File, label: string) => Promise<boolean>;
};

type CreationMode = "text" | "image";

export function CreateEmbeddingPanel({
  dimensions,
  disabled,
  isAdding,
  onAddText,
  onAddImage,
}: CreateEmbeddingPanelProps) {
  const [mode, setMode] = useState<CreationMode>("text");
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageLabel, setImageLabel] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function selectImage(file: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextPreviewUrl = file ? URL.createObjectURL(file) : null;
    previewUrlRef.current = nextPreviewUrl;
    setImageFile(file);
    setPreviewUrl(nextPreviewUrl);
  }

  async function handleTextSubmit(event: FormEvent) {
    event.preventDefault();
    if (await onAddText(text)) setText("");
  }

  async function handleImageSubmit(event: FormEvent) {
    event.preventDefault();
    if (!imageFile) return;
    if (await onAddImage(imageFile, imageLabel)) {
      selectImage(null);
      setImageLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <article className="panel action-panel">
      <div className="step-label"><span>01</span> CREATE</div>
      <div className="panel-heading">
        <div>
          <h2>Store an idea</h2>
          <p>Text and images become comparable {dimensions}-value vectors.</p>
        </div>
        <Database size={20} />
      </div>

      <div className="mode-switch" role="tablist" aria-label="Embedding type">
        <button type="button" role="tab" aria-selected={mode === "text"} onClick={() => setMode("text")}>
          <Type size={14} /> Text
        </button>
        <button type="button" role="tab" aria-selected={mode === "image"} onClick={() => setMode("image")}>
          <FileImage size={14} /> Image
        </button>
      </div>

      {mode === "text" ? (
        <form onSubmit={handleTextSubmit}>
          <label htmlFor="embedding-text">Text to embed</label>
          <textarea
            id="embedding-text"
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, 1000))}
            placeholder="Try: A small robot learning to paint..."
            rows={4}
          />
          <div className="field-footer">
            <span>{text.length} / 1000</span>
            <button className="button button-primary" disabled={!text.trim() || disabled}>
              {isAdding ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}
              Create vector
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleImageSubmit}>
          <label htmlFor="embedding-image">Image to embed</label>
          <button
            type="button"
            className={`image-dropzone ${previewUrl ? "has-preview" : ""}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <Image src={previewUrl} alt="Selected upload preview" width={640} height={360} unoptimized />
            ) : (
              <><ImagePlus size={26} /><strong>Choose an image</strong><span>JPEG, PNG, or WebP, up to 8 MB</span></>
            )}
          </button>
          <input
            ref={fileInputRef}
            id="embedding-image"
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
          />
          <label htmlFor="image-label">Label <span className="optional">optional</span></label>
          <input
            id="image-label"
            type="text"
            maxLength={160}
            value={imageLabel}
            onChange={(event) => setImageLabel(event.target.value)}
            placeholder={imageFile?.name ?? "A memorable description"}
          />
          <div className="field-footer image-field-footer">
            <span>{imageFile ? `${imageFile.name} · ${(imageFile.size / 1024 / 1024).toFixed(1)} MB` : "No image selected"}</span>
            <button className="button button-primary" disabled={!imageFile || disabled}>
              {isAdding ? <LoaderCircle className="spin" size={16} /> : <ImagePlus size={16} />}
              Embed image
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
