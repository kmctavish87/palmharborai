"use client";

import { useRef, useState } from "react";
import { Check, Plus, Upload } from "lucide-react";

import type { BrandProfile, StoredAsset } from "@/lib/types";
import { createId } from "@/lib/utils";
import { readImageDimensions } from "@/lib/image-processing";
import { saveAsset } from "@/lib/storage";
import { AssetThumbnail } from "@/components/asset-thumbnail";
import { LibraryPageHeader } from "@/components/library-page-header";
import { Button } from "@/components/ui";

export function BrandLibrary({ brands, readOnly = false, onSave }: { brands: BrandProfile[]; readOnly?: boolean; onSave: (brand: BrandProfile) => Promise<void> }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [drafts, setDrafts] = useState<Record<string, BrandProfile>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);

  const selected = brands.find((brand) => brand.id === selectedId) ?? brands[0];
  const draft = selected ? drafts[selected.id] ?? selected : undefined;

  function field<K extends keyof BrandProfile>(key: K, value: BrandProfile[K]) {
    if (!draft) return;
    setDrafts((current) => ({ ...current, [draft.id]: { ...draft, [key]: value } }));
    setSaved(false);
  }

  async function uploadLogo(file: File) {
    if (!draft) return;
    const dimensions = await readImageDimensions(file);
    const now = new Date().toISOString();
    const assetId = createId("brand-logo");
    const asset: StoredAsset = {
      id: assetId,
      projectId: `brand:${draft.id}`,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      blob: file,
      width: dimensions.width,
      height: dimensions.height,
      createdAt: now,
      ownershipType: "corporate",
      isOriginal: true,
    };
    await saveAsset(asset);
    const next = { ...draft, logoAssetIds: [...draft.logoAssetIds, assetId], updatedAt: now };
    await onSave(next);
    setDrafts((current) => ({ ...current, [next.id]: next }));
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const next = { ...draft, updatedAt: new Date().toISOString() };
      await onSave(next);
      setDrafts((current) => ({ ...current, [next.id]: next }));
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  if (!draft) return null;

  return (
    <main className="library-page">
      <LibraryPageHeader eyebrow="Creative intelligence" title="Brand library" description="Keep the approved visual and messaging rules that guide every creative request." actions={!readOnly ? <Button variant="primary" icon={saved ? <Check size={15} /> : undefined} busy={busy} onClick={save}>{saved ? "Saved" : "Save guidance"}</Button> : undefined} />
      <div className="library-layout">
        <aside className="library-list">
          <p className="panel-label">Brands</p>
          {brands.map((brand) => (
            <button key={brand.id} className={brand.id === draft.id ? "library-list__item is-active" : "library-list__item"} onClick={() => setSelectedId(brand.id)}>
              <span className="brand-swatch-row">{brand.colors.slice(0, 3).map((color) => <i key={color} style={{ background: color }} />)}</span>
              <span><strong>{brand.name}</strong><small>{brand.logoAssetIds.length} approved logo{brand.logoAssetIds.length === 1 ? "" : "s"}</small></span>
            </button>
          ))}
        </aside>
        <section className="library-editor">
          <div className="editor-heading"><div><p className="eyebrow">Brand profile</p><h2>{draft.name}</h2></div><span className="status-pill"><Check size={11} /> Private guidance</span></div>
          <div className="brand-logo-section">
            <div className="editor-section-title"><div><h3>Approved logos</h3><p>Corporate assets available to the Logo Exporter.</p></div>{!readOnly ? <Button icon={<Upload size={14} />} onClick={() => uploadInput.current?.click()}>Upload logo</Button> : null}</div>
            <input ref={uploadInput} hidden type="file" accept=".png,.jpg,.jpeg,.webp,.svg" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); event.target.value = ""; }} />
            <div className="logo-strip">
              {draft.logoAssetIds.map((assetId, index) => <AssetThumbnail key={assetId} assetId={assetId} alt={`${draft.name} logo ${index + 1}`} />)}
              {!draft.logoAssetIds.length ? <button disabled={readOnly} className="logo-add" onClick={() => uploadInput.current?.click()}><Plus size={18} /><span>Add approved logo</span></button> : null}
            </div>
          </div>
          <div className="editor-grid">
            <label className="field"><span>Brand colors (hex, comma-separated)</span><input disabled={readOnly} value={draft.colors.join(", ")} onChange={(event) => field("colors", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
            <label className="field"><span>Font guidance</span><input disabled={readOnly} value={draft.fonts.join(", ")} onChange={(event) => field("fonts", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
          </div>
          <div className="color-preview">{draft.colors.map((color) => <span key={color} style={{ background: color }}><small>{color}</small></span>)}</div>
          <div className="editor-grid">
            <label className="field"><span>Approved messaging</span><textarea disabled={readOnly} rows={4} value={draft.approvedMessaging} onChange={(event) => field("approvedMessaging", event.target.value)} /></label>
            <label className="field"><span>Prohibited messaging</span><textarea disabled={readOnly} rows={4} value={draft.prohibitedMessaging} onChange={(event) => field("prohibitedMessaging", event.target.value)} /></label>
            <label className="field"><span>Disclaimers</span><textarea disabled={readOnly} rows={4} value={draft.disclaimers} onChange={(event) => field("disclaimers", event.target.value)} /></label>
            <label className="field"><span>CTA conventions</span><textarea disabled={readOnly} rows={4} value={draft.ctaConventions} onChange={(event) => field("ctaConventions", event.target.value)} /></label>
          </div>
          <label className="field"><span>Brand notes</span><textarea disabled={readOnly} rows={4} value={draft.notes} onChange={(event) => field("notes", event.target.value)} /></label>
        </section>
      </div>
    </main>
  );
}
