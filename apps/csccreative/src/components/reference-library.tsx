"use client";

import { useMemo, useState } from "react";
import { Check, Eye, EyeOff, Pencil, Sparkles, Trash2, Upload } from "lucide-react";

import { readImageDimensions } from "@/lib/image-processing";
import { saveAsset } from "@/lib/storage";
import type { BrandProfile, CreativeStyleProfile, ReferenceAsset, StoredAsset } from "@/lib/types";
import { createId } from "@/lib/utils";
import { AssetThumbnail } from "@/components/asset-thumbnail";
import { LibraryPageHeader } from "@/components/library-page-header";
import { Button, EmptyState } from "@/components/ui";

const CATEGORIES = ["Meta Ads", "Display Ads", "Email", "Posters", "Door Hangers", "Machine Signage", "Flyers", "Resident Communications", "Sales Collateral"];
const STYLE_FIELDS: Array<{ key: keyof CreativeStyleProfile; label: string; wide?: boolean }> = [
  { key: "name", label: "Profile name", wide: true },
  { key: "typographyHierarchy", label: "Typography hierarchy" },
  { key: "textPlacement", label: "Text placement" },
  { key: "whitespace", label: "Whitespace" },
  { key: "imagery", label: "Imagery" },
  { key: "ctaPlacement", label: "CTA placement" },
  { key: "logoPlacement", label: "Logo placement" },
  { key: "headlineLength", label: "Headline length" },
  { key: "visualDensity", label: "Visual density" },
  { key: "layoutPatterns", label: "Layout patterns" },
  { key: "brandColorUsage", label: "Brand color usage" },
];

function StyleProfileModal({ profile, onChange, onClose, onSave }: { profile: CreativeStyleProfile; onChange: (key: keyof CreativeStyleProfile, value: string) => void; onClose: () => void; onSave: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal modal--wide style-profile-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div>
            <p className="eyebrow">Editable analysis</p>
            <h2>Creative Style Profile</h2>
            <p>Review every generated field before saving it as reusable guidance.</p>
          </div>
        </div>
        <div className="editor-grid">
          {STYLE_FIELDS.map((field) => (
            <label key={String(field.key)} className={field.wide ? "field field--wide" : "field"}>
              <span>{field.label}</span>
              <textarea rows={field.wide ? 2 : 3} value={String(profile[field.key])} onChange={(event) => onChange(field.key, event.target.value)} />
            </label>
          ))}
        </div>
        <div className="modal__footer">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onSave}>Save style profile</Button>
        </div>
      </section>
    </div>
  );
}

function ReferenceEditor({ reference, brands, onChange, onClose, onSave }: { reference: ReferenceAsset; brands: BrandProfile[]; onChange: (reference: ReferenceAsset) => void; onClose: () => void; onSave: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__header"><div><p className="eyebrow">Reference context</p><h2>Edit reference metadata</h2><p>Metadata improves filtering and the context attached to project requests.</p></div></div>
        <div className="form">
          <label className="field"><span>Title</span><input value={reference.title} onChange={(event) => onChange({ ...reference, title: event.target.value })} /></label>
          <div className="form__row">
            <label className="field"><span>Brand</span><select value={reference.brand} onChange={(event) => onChange({ ...reference, brand: event.target.value })}>{brands.map((brand) => <option key={brand.id}>{brand.name}</option>)}</select></label>
            <label className="field"><span>Category</span><select value={reference.category} onChange={(event) => onChange({ ...reference, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          </div>
          <div className="form__row">
            <label className="field"><span>Campaign</span><input value={reference.campaign} onChange={(event) => onChange({ ...reference, campaign: event.target.value })} placeholder="Optional" /></label>
            <label className="field"><span>Ownership</span><select value={reference.ownershipType} onChange={(event) => onChange({ ...reference, ownershipType: event.target.value as ReferenceAsset["ownershipType"] })}><option value="reference_only">Reference only</option><option value="corporate">CSC corporate</option><option value="personal">Personal/private</option></select></label>
          </div>
          <label className="field"><span>Tags (comma-separated)</span><input value={reference.tags.join(", ")} onChange={(event) => onChange({ ...reference, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="resident, subscription, promotion" /></label>
          <label className="field"><span>Notes</span><textarea rows={4} value={reference.notes} onChange={(event) => onChange({ ...reference, notes: event.target.value })} placeholder="What makes this a useful reference?" /></label>
          <label className="toggle-row"><input type="checkbox" checked={reference.active} onChange={(event) => onChange({ ...reference, active: event.target.checked })} /><span><strong>Available as project context</strong><small>Inactive references remain stored but cannot be selected in a project.</small></span></label>
        </div>
        <div className="modal__footer"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onSave}>Save reference</Button></div>
      </section>
    </div>
  );
}

export function ReferenceLibrary({ brands, references, profiles, onSaveReference, onRemoveReference, onSaveProfile }: { brands: BrandProfile[]; references: ReferenceAsset[]; profiles: CreativeStyleProfile[]; onSaveReference: (reference: ReferenceAsset) => Promise<void>; onRemoveReference: (id: string) => Promise<void>; onSaveProfile: (profile: CreativeStyleProfile) => Promise<void> }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<CreativeStyleProfile>();
  const [editing, setEditing] = useState<ReferenceAsset>();
  const [filter, setFilter] = useState("All");
  const visible = useMemo(() => filter === "All" ? references : references.filter((item) => item.brand === filter), [filter, references]);

  async function upload(file: File) {
    setUploading(true);
    try {
      const title = file.name.replace(/\.[^.]+$/, "");
      const brand = brands[0]?.name ?? "CSC ServiceWorks";
      const dimensions = await readImageDimensions(file);
      const now = new Date().toISOString();
      const referenceId = createId("reference");
      const assetId = createId("reference-asset");
      const asset: StoredAsset = { id: assetId, projectId: `reference:${referenceId}`, filename: file.name, mimeType: file.type || "application/octet-stream", blob: file, width: dimensions.width, height: dimensions.height, createdAt: now, ownershipType: "reference_only", isOriginal: true };
      await saveAsset(asset);
      await onSaveReference({ id: referenceId, title, brand, campaign: "", category: CATEGORIES[0], tags: [], notes: "", active: true, assetId, ownershipType: "reference_only", createdAt: now });
    } finally {
      setUploading(false);
    }
  }

  function analyze() {
    const picked = references.filter((item) => selected.includes(item.id));
    if (!picked.length) return;
    const now = new Date().toISOString();
    setProfile({
      id: createId("style"),
      name: `${picked[0].brand} reference style`,
      brand: picked[0].brand,
      referenceIds: picked.map((item) => item.id),
      typographyHierarchy: "One concise headline, short supporting line, and a clearly separated CTA.",
      textPlacement: "Headline in the upper or left third; supporting copy grouped directly beneath.",
      whitespace: "Moderate negative space around the primary message and product focus.",
      imagery: "Brand-relevant lifestyle or product imagery with a single dominant subject.",
      ctaPlacement: "High-contrast CTA in the lower third with safe edge spacing.",
      logoPlacement: "Top-left or bottom-right, smaller than the campaign message.",
      headlineLength: "Aim for 3–8 words and one clear benefit.",
      visualDensity: "Low to medium; avoid competing decorative elements.",
      layoutPatterns: `Reference-led draft from ${picked.length} selected asset${picked.length === 1 ? "" : "s"}. Review and edit every field before use.`,
      brandColorUsage: "Use one primary brand color, one accent, and a neutral background.",
      updatedAt: now,
    });
  }

  async function saveProfile() {
    if (!profile) return;
    const next = { ...profile, updatedAt: new Date().toISOString() };
    await onSaveProfile(next);
    await Promise.all(next.referenceIds.map((id) => {
      const reference = references.find((item) => item.id === id);
      return reference ? onSaveReference({ ...reference, styleProfileId: next.id }) : Promise.resolve();
    }));
    setProfile(undefined);
    setSelected([]);
  }

  function updateProfileField(key: keyof CreativeStyleProfile, value: string) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  }

  return (
    <main className="library-page">
      <LibraryPageHeader
        eyebrow="Reference context"
        title="Creative reference library"
        description="Use previous work as private, project-level context. References are never treated as model training."
        actions={(
          <>
            <label className="button button--secondary upload-button">
              <Upload size={14} />
              {uploading ? "Uploading…" : "Upload reference"}
              <input hidden type="file" accept=".png,.jpg,.jpeg,.webp,.svg,.pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = ""; }} />
            </label>
            <Button variant="primary" icon={<Sparkles size={14} />} disabled={!selected.length} onClick={analyze}>Analyze creative style</Button>
          </>
        )}
      />
      <div className="filter-row">
        <button className={filter === "All" ? "is-active" : ""} onClick={() => setFilter("All")}>All references <span>{references.length}</span></button>
        {brands.map((brand) => <button key={brand.id} className={filter === brand.name ? "is-active" : ""} onClick={() => setFilter(brand.name)}>{brand.name}</button>)}
      </div>
      {visible.length ? (
        <div className="reference-grid">
          {visible.map((reference) => {
            const isSelected = selected.includes(reference.id);
            return (
              <article key={reference.id} className={isSelected ? "reference-card is-selected" : "reference-card"}>
                <button className="reference-card__preview" onClick={() => setSelected((current) => isSelected ? current.filter((id) => id !== reference.id) : [...current, reference.id])}>
                  <AssetThumbnail assetId={reference.assetId} alt={reference.title} />
                  <span className="selection-check">{isSelected ? <Check size={13} /> : null}</span>
                </button>
                <div className="reference-card__body">
                  <div><strong>{reference.title}</strong><small>{reference.brand} · {reference.category}</small></div>
                  <div className="reference-actions">
                    <button title="Edit metadata" onClick={() => setEditing({ ...reference, tags: [...reference.tags] })}><Pencil size={14} /></button>
                    <button title={reference.active ? "Deactivate" : "Activate"} onClick={() => void onSaveReference({ ...reference, active: !reference.active })}>{reference.active ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button title="Delete" onClick={() => { if (window.confirm(`Delete “${reference.title}”?`)) void onRemoveReference(reference.id); }}><Trash2 size={14} /></button>
                  </div>
                </div>
                {reference.styleProfileId ? <span className="profile-linked"><Sparkles size={10} /> Style profile linked</span> : null}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Upload size={22} />} title="Build a private reference set" description="Upload existing campaign work, tag it by brand, then select up to the most useful examples as project context." />
      )}
      {profiles.length ? (
        <section className="saved-profiles">
          <div className="section-heading"><div><h2>Creative Style Profiles</h2><p>Editable guidance derived from selected examples—not model training.</p></div></div>
          <div className="profile-summary-grid">
            {profiles.map((item) => (
              <article key={item.id}>
                <Sparkles size={17} />
                <div><strong>{item.name}</strong><small>{item.referenceIds.length} reference{item.referenceIds.length === 1 ? "" : "s"} · Updated {new Date(item.updatedAt).toLocaleDateString()}</small><p>{item.layoutPatterns}</p></div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      {profile ? <StyleProfileModal profile={profile} onChange={updateProfileField} onClose={() => setProfile(undefined)} onSave={() => void saveProfile()} /> : null}
      {editing ? <ReferenceEditor reference={editing} brands={brands} onChange={setEditing} onClose={() => setEditing(undefined)} onSave={() => { void onSaveReference(editing).then(() => setEditing(undefined)); }} /> : null}
    </main>
  );
}
