"use client";

import { useCallback, useState } from "react";
import { FileImage, FileText, LockKeyhole, UploadCloud } from "lucide-react";

import type { CreativeVersion, StoredAsset } from "@/lib/types";
import { formatDimensions } from "@/lib/utils";
import { Button } from "@/components/ui";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
];

export function CreativeCanvas({
  asset,
  assetUrl,
  version,
  loading,
  onUpload,
}: {
  asset?: StoredAsset;
  assetUrl?: string;
  version?: CreativeVersion;
  loading: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const processFile = useCallback(async (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Use PNG, JPG, WEBP, SVG, or PDF.");
      return;
    }
    if (file.size > 30 * 1024 * 1024) {
      setError("Files must be 30 MB or smaller for this prototype.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await onUpload(file);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }, [onUpload]);

  if (!asset && !loading) {
    return (
      <section className="canvas-stage canvas-stage--empty">
        <label
          className={dragging ? "upload-zone is-dragging" : "upload-zone"}
          onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void processFile(event.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
            onChange={(event) => void processFile(event.target.files?.[0])}
          />
          <span className="upload-zone__icon"><UploadCloud size={26} /></span>
          <h2>Bring in your finished creative</h2>
          <p>Drop an asset here, or choose a file. The source is preserved exactly as uploaded.</p>
          <Button type="button" variant="primary" busy={busy} icon={<FileImage size={16} />}>
            Choose an asset
          </Button>
          <div className="upload-zone__formats">
            <span>PNG</span><span>JPG</span><span>WEBP</span><span>SVG</span><span>PDF</span>
          </div>
          <div className="upload-zone__privacy"><LockKeyhole size={13} /> Local and private by default</div>
          {error ? <p className="upload-zone__error">{error}</p> : null}
        </label>
      </section>
    );
  }

  return (
    <section className="canvas-stage">
      <div className="canvas-toolbar">
        <div className="canvas-toolbar__title">
          <span className="status-dot" />
          <strong>{version?.name ?? "Creative"}</strong>
          {version ? <span>{formatDimensions(version.dimensions)}</span> : null}
        </div>
        <div className="canvas-toolbar__scale">Fit <span>100%</span></div>
      </div>
      <div className="canvas-workarea">
        {loading ? <div className="canvas-loader" /> : asset?.mimeType === "application/pdf" ? (
          <div className="pdf-placeholder">
            <FileText size={34} />
            <h3>{asset.filename}</h3>
            <p>The original PDF is safely stored. Rendered PDF editing arrives in a later phase.</p>
          </div>
        ) : assetUrl ? (
          <div
            className="creative-frame"
            style={{ aspectRatio: `${Math.max(version?.dimensions.width ?? asset?.width ?? 1, 1)} / ${Math.max(version?.dimensions.height ?? asset?.height ?? 1, 1)}` }}
          >
            {/* The blob URL is user-controlled local content, so Next image optimization is not applicable. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={assetUrl} alt={`${version?.name ?? "Creative"} preview`} />
          </div>
        ) : null}
      </div>
      <div className="canvas-footer">
        <span><LockKeyhole size={13} /> Original protected</span>
        <span>Mock provider · no credits used</span>
      </div>
    </section>
  );
}
