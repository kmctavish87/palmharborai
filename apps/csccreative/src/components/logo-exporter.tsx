"use client";

import { useMemo, useState } from "react";
import { Download, Frame, ShieldCheck } from "lucide-react";

import { AssetThumbnail } from "@/components/asset-thumbnail";
import { LibraryPageHeader } from "@/components/library-page-header";
import { Button, EmptyState } from "@/components/ui";
import { downloadBlob, exportLogoImage, validateDimensions } from "@/lib/image-processing";
import { getAsset } from "@/lib/storage";
import type { BrandProfile, Dimensions } from "@/lib/types";

const LOGO_PRESETS = [
  { label: "Email signature", width: 600, height: 200 },
  { label: "Square profile", width: 1080, height: 1080 },
  { label: "Presentation", width: 1600, height: 900 },
  { label: "Web header", width: 1200, height: 320 },
];

export function LogoExporter({ brands }: { brands: BrandProfile[] }) {
  const availableBrands = useMemo(() => brands.filter((brand) => brand.logoAssetIds.length), [brands]);
  const [brandId, setBrandId] = useState<string>();
  const brand = availableBrands.find((item) => item.id === brandId) ?? availableBrands[0];
  const [assetId, setAssetId] = useState<string>();
  const selectedAssetId = brand?.logoAssetIds.includes(assetId ?? "") ? assetId : brand?.logoAssetIds[0];
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 1200, height: 320 });
  const [format, setFormat] = useState<"png" | "jpg" | "webp">("png");
  const [background, setBackground] = useState<"transparent" | "white">("transparent");
  const [mode, setMode] = useState<"fit" | "exact">("fit");
  const [padding, setPadding] = useState(40);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  async function exportLogo() {
    if (!brand || !selectedAssetId) return;
    setBusy(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      validateDimensions(dimensions);
      const asset = await getAsset(selectedAssetId);
      if (!asset) throw new Error("The selected logo is unavailable.");
      const mimeType = format === "jpg" ? "image/jpeg" : `image/${format}` as "image/png" | "image/webp";
      const blob = await exportLogoImage(asset.blob, dimensions, { mimeType, background: format === "jpg" ? "white" : background, padding, mode });
      const filename = `${brand.name.replace(/[^a-z0-9]+/gi, "")}_Logo_${dimensions.width}x${dimensions.height}.${format}`;
      downloadBlob(blob, filename);
      setSuccess(`${filename} downloaded.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Logo export failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="library-page logo-exporter-page">
      <LibraryPageHeader eyebrow="Approved self-service" title="Logo Exporter" description="Create correctly sized logo files without stretching or changing an approved source." />
      {!availableBrands.length ? <EmptyState icon={<Frame size={23} />} title="No approved logos yet" description="A designer can add corporate logo files in the Brand Library. They will appear here automatically." /> : <div className="logo-exporter-layout">
        <section className="logo-preview-panel">
          <div className={`logo-preview logo-preview--${background}`}><AssetThumbnail assetId={selectedAssetId} alt={`${brand?.name} logo`} /></div>
          <div className="approved-note"><ShieldCheck size={16} /><div><strong>Approved source protected</strong><p>The original logo file is never modified. Each export is a new local download.</p></div></div>
        </section>
        <section className="logo-controls">
          <div className="control-section"><p className="panel-label">1 · Brand and variant</p><label className="field"><span>Brand</span><select value={brand?.id} onChange={(event) => { setBrandId(event.target.value); setAssetId(undefined); }}>{availableBrands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="logo-variant-grid">{brand?.logoAssetIds.map((id, index) => <button key={id} className={selectedAssetId === id ? "is-active" : ""} onClick={() => setAssetId(id)}><AssetThumbnail assetId={id} alt={`Variant ${index + 1}`} /><span>Variant {index + 1}</span></button>)}</div></div>
          <div className="control-section"><p className="panel-label">2 · Output size</p><div className="preset-buttons">{LOGO_PRESETS.map((preset) => <button key={preset.label} className={dimensions.width === preset.width && dimensions.height === preset.height ? "is-active" : ""} onClick={() => setDimensions(preset)}><strong>{preset.label}</strong><small>{preset.width} × {preset.height}</small></button>)}</div><div className="form__row"><label className="field"><span>Width</span><input type="number" value={dimensions.width} onChange={(event) => setDimensions({ ...dimensions, width: Number(event.target.value) })} /></label><label className="field"><span>Height</span><input type="number" value={dimensions.height} onChange={(event) => setDimensions({ ...dimensions, height: Number(event.target.value) })} /></label></div></div>
          <div className="control-section"><p className="panel-label">3 · Format and fit</p><div className="form__row"><label className="field"><span>File type</span><select value={format} onChange={(event) => { const next = event.target.value as typeof format; setFormat(next); if (next === "jpg") setBackground("white"); }}><option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WEBP</option></select></label><label className="field"><span>Placement</span><select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="fit">Fit inside dimensions</option><option value="exact">Fill exact canvas</option></select></label></div><div className="form__row"><label className="field"><span>Background</span><select value={background} disabled={format === "jpg"} onChange={(event) => setBackground(event.target.value as typeof background)}><option value="transparent">Transparent</option><option value="white">White</option></select></label><label className="field"><span>Padding · {padding}px</span><input type="range" min="0" max="180" value={padding} onChange={(event) => setPadding(Number(event.target.value))} /></label></div></div>
          {error ? <p className="form__error">{error}</p> : null}
          {success ? <p className="logo-export-success"><ShieldCheck size={13} /> {success}</p> : null}
          <Button className="full-width" variant="primary" icon={<Download size={15} />} busy={busy} onClick={exportLogo}>Export approved logo</Button>
        </section>
      </div>}
    </main>
  );
}
