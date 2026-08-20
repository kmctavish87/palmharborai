"use client";

import { Copy, History, Pencil, RotateCcw, Trash2 } from "lucide-react";

import type { CreativeVersion } from "@/lib/types";
import { formatDimensions, formatRelativeDate } from "@/lib/utils";
import { EmptyState, IconButton } from "@/components/ui";

export function VersionHistory({
  versions,
  currentVersionId,
  onRestore,
  onDuplicate,
  onRename,
  onDelete,
}: {
  versions: CreativeVersion[];
  currentVersionId?: string;
  onRestore: (version: CreativeVersion) => void;
  onDuplicate: (version: CreativeVersion) => Promise<void>;
  onRename: (version: CreativeVersion) => void;
  onDelete: (version: CreativeVersion) => void;
}) {
  return (
    <section className="inspector-section version-section">
      <div className="inspector-section__heading">
        <div><p className="eyebrow">Timeline</p><h3>Version history</h3></div>
        <span className="count-badge">{versions.length}</span>
      </div>
      {versions.length ? (
        <div className="version-list">
          {[...versions].reverse().map((version, reverseIndex) => {
            const index = versions.length - reverseIndex;
            const current = version.id === currentVersionId;
            return (
              <article className={current ? "version-item is-current" : "version-item"} key={version.id}>
                <button className="version-item__main" onClick={() => onRestore(version)}>
                  <span className="version-item__number">V{index}</span>
                  <span className="version-item__copy">
                    <strong>{version.name}</strong>
                    <small>{formatDimensions(version.dimensions)} · {formatRelativeDate(version.createdAt)}</small>
                  </span>
                  {current ? <span className="current-label">Current</span> : <RotateCcw size={14} />}
                </button>
                <div className="version-item__actions">
                  <IconButton label="Rename version" onClick={() => onRename(version)}><Pencil size={13} /></IconButton>
                  <IconButton label="Duplicate version" onClick={() => void onDuplicate(version)}><Copy size={13} /></IconButton>
                  {!version.isOriginal && versions.length > 1 ? (
                    <IconButton label="Delete version" onClick={() => onDelete(version)}><Trash2 size={13} /></IconButton>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<History size={20} />}
          title="No versions yet"
          description="Upload a source asset to begin a non-destructive history."
        />
      )}
    </section>
  );
}
