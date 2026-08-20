"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  History,
  MessageSquareText,
  PanelRight,
  Redo2,
  Save,
  Settings2,
  Undo2,
  Upload,
  X,
} from "lucide-react";

import { BRANDS } from "@/lib/constants";
import {
  convertImage,
  downloadBlob,
  readImageDimensions,
  smartResizeImage,
  validateDimensions,
} from "@/lib/image-processing";
import { getAsset, saveAsset } from "@/lib/storage";
import type {
  CreativeActionResult,
  CreativeProject,
  CreativeVersion,
  Dimensions,
  Revision,
  StoredAsset,
} from "@/lib/types";
import { createId, dimensionsEqual, projectFilename } from "@/lib/utils";
import { MockImageProvider } from "@/services/mock-image-provider";
import { Button, IconButton } from "@/components/ui";
import { ChatPanel } from "@/components/chat-panel";
import { CreativeCanvas } from "@/components/creative-canvas";
import { DimensionPicker } from "@/components/dimension-picker";
import { VersionHistory } from "@/components/version-history";

type InspectorTab = "assistant" | "output" | "history";
type Toast = { tone: "success" | "error"; message: string };

const EXPORT_TYPES = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
} as const;

export function CreativeWorkspace({
  project,
  onUpdate,
  onBack,
}: {
  project: CreativeProject;
  onUpdate: (project: CreativeProject) => Promise<CreativeProject>;
  onBack: () => void;
}) {
  const [asset, setAsset] = useState<StoredAsset>();
  const [assetUrl, setAssetUrl] = useState<string>();
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("assistant");
  const [exportFormat, setExportFormat] = useState<keyof typeof EXPORT_TYPES>("png");
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<Toast>();
  const uploadInput = useRef<HTMLInputElement>(null);

  const currentVersion = useMemo(
    () => project.versions.find((version) => version.id === project.currentVersionId),
    [project.currentVersionId, project.versions],
  );
  const currentAssetId = currentVersion?.assetId;
  const assetLoading = Boolean(currentAssetId && asset?.id !== currentAssetId);
  const currentIndex = currentVersion
    ? project.versions.findIndex((version) => version.id === currentVersion.id)
    : -1;

  useEffect(() => {
    if (!currentAssetId) return;
    let active = true;
    let nextUrl: string | undefined;
    getAsset(currentAssetId)
      .then((record) => {
        if (!active) return;
        setAsset(record);
        if (record && record.mimeType !== "application/pdf") {
          nextUrl = URL.createObjectURL(record.blob);
          setAssetUrl(nextUrl);
        } else {
          setAssetUrl(undefined);
        }
      })
      .catch((cause) => showToast("error", cause instanceof Error ? cause.message : "Asset could not be loaded."));
    return () => {
      active = false;
      if (nextUrl) URL.revokeObjectURL(nextUrl);
    };
  }, [currentAssetId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(undefined), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function showToast(tone: Toast["tone"], message: string) {
    setToast({ tone, message });
  }

  async function updateProject(changes: Partial<CreativeProject>) {
    return onUpdate({ ...project, ...changes, modifiedAt: new Date().toISOString() });
  }

  const uploadAsset = useCallback(async (file: File) => {
    const dimensions = await readImageDimensions(file);
    const now = new Date().toISOString();
    const assetId = createId("asset");
    const isOriginal = !project.originalAssetId;
    const record: StoredAsset = {
      id: assetId,
      projectId: project.id,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      blob: file,
      width: dimensions.width,
      height: dimensions.height,
      createdAt: now,
      ownershipType: "personal",
      isOriginal,
    };
    await saveAsset(record);
    const version: CreativeVersion = {
      id: createId("version"),
      assetId,
      name: isOriginal ? "Original" : "Uploaded source",
      action: isOriginal ? "Original uploaded asset" : "Additional source uploaded",
      dimensions,
      createdAt: now,
      isOriginal,
      sourceVersionId: project.currentVersionId,
    };
    await onUpdate({
      ...project,
      originalAssetId: project.originalAssetId ?? assetId,
      currentVersionId: version.id,
      versions: [...project.versions, version],
      outputDimensions: dimensions.width && dimensions.height ? dimensions : project.outputDimensions,
      modifiedAt: now,
    });
    setInspectorTab("assistant");
    showToast("success", isOriginal ? "Original saved and protected." : "New source added as a version.");
  }, [onUpdate, project]);

  async function createDerivedVersions({
    instruction,
    actionLabel,
    message,
    count = 1,
    dimensions = project.outputDimensions,
    addRevision = true,
  }: {
    instruction: string;
    actionLabel: string;
    message: string;
    count?: number;
    dimensions?: Dimensions;
    addRevision?: boolean;
  }) {
    if (!asset || !currentVersion) throw new Error("Upload or select an asset first.");
    validateDimensions(dimensions);
    const now = new Date().toISOString();
    const newVersions: CreativeVersion[] = [];

    for (let index = 0; index < count; index += 1) {
      const blob = await smartResizeImage(asset.blob, dimensions, "image/png");
      const assetId = createId("asset");
      await saveAsset({
        ...asset,
        id: assetId,
        filename: `${actionLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "revision"}.png`,
        mimeType: "image/png",
        blob,
        width: dimensions.width,
        height: dimensions.height,
        createdAt: now,
        isOriginal: false,
      });
      newVersions.push({
        id: createId("version"),
        assetId,
        name: count > 1 ? `${actionLabel} ${index + 1}` : actionLabel,
        action: instruction,
        dimensions,
        createdAt: new Date(Date.now() + index).toISOString(),
        sourceVersionId: currentVersion.id,
      });
    }

    const revision: Revision = {
      id: createId("revision"),
      instruction,
      aiAction: message,
      createdAt: now,
      resultingVersionIds: newVersions.map((version) => version.id),
      status: "completed",
    };
    await onUpdate({
      ...project,
      versions: [...project.versions, ...newVersions],
      revisions: addRevision ? [...project.revisions, revision] : project.revisions,
      currentVersionId: newVersions.at(-1)?.id,
      outputDimensions: dimensions,
      modifiedAt: now,
    });
    showToast("success", count > 1 ? `${count} versions created.` : "New version created.");
    return newVersions;
  }

  async function createResize() {
    try {
      await createDerivedVersions({
        instruction: `Create a ${project.outputDimensions.width} × ${project.outputDimensions.height} version`,
        actionLabel: `${project.outputDimensions.width} × ${project.outputDimensions.height}`,
        message: "Recomposed the source without stretching or destructive cropping.",
        dimensions: project.outputDimensions,
      });
      setInspectorTab("history");
    } catch (cause) {
      showToast("error", cause instanceof Error ? cause.message : "Resize failed.");
      throw cause;
    }
  }

  async function requestCreativeAction(instruction: string) {
    const provider = new MockImageProvider();
    return provider.editImage({
      instruction,
      currentDimensions: currentVersion?.dimensions,
      projectName: project.name,
      brand: project.brand,
      campaign: project.campaign,
    }) satisfies Promise<CreativeActionResult>;
  }

  async function submitInstruction(instruction: string) {
    if (!asset || !currentVersion) return;
    setAssistantBusy(true);
    try {
      const result = await requestCreativeAction(instruction);
      await createDerivedVersions({
        instruction,
        actionLabel: result.actionLabel,
        message: result.message,
        count: result.variationCount ?? 1,
        dimensions: result.dimensions ?? currentVersion.dimensions,
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "The creative request failed.";
      const failedRevision: Revision = {
        id: createId("revision"),
        instruction,
        aiAction: message,
        createdAt: new Date().toISOString(),
        resultingVersionIds: [],
        status: "failed",
      };
      await updateProject({ revisions: [...project.revisions, failedRevision] });
      showToast("error", message);
    } finally {
      setAssistantBusy(false);
    }
  }

  async function changeDimensions(dimensions: Dimensions, remember = false) {
    const recent = remember
      ? [dimensions, ...project.recentCustomDimensions.filter((item) => !dimensionsEqual(item, dimensions))].slice(0, 5)
      : project.recentCustomDimensions;
    await updateProject({ outputDimensions: dimensions, recentCustomDimensions: recent });
  }

  async function restoreVersion(version: CreativeVersion) {
    await updateProject({ currentVersionId: version.id, outputDimensions: version.dimensions });
    showToast("success", `${version.name} restored to the canvas.`);
  }

  async function duplicateVersion(version: CreativeVersion) {
    const source = await getAsset(version.assetId);
    if (!source) throw new Error("Version asset is unavailable.");
    const now = new Date().toISOString();
    const assetId = createId("asset");
    await saveAsset({
      ...source,
      id: assetId,
      blob: source.blob.slice(0, source.blob.size, source.mimeType),
      createdAt: now,
      isOriginal: false,
    });
    const duplicate: CreativeVersion = {
      ...version,
      id: createId("version"),
      assetId,
      name: `${version.name} copy`,
      action: `Duplicated ${version.name}`,
      sourceVersionId: version.id,
      createdAt: now,
      isOriginal: false,
    };
    await onUpdate({
      ...project,
      versions: [...project.versions, duplicate],
      currentVersionId: duplicate.id,
      outputDimensions: duplicate.dimensions,
      modifiedAt: now,
    });
    showToast("success", "Version duplicated.");
  }

  async function renameVersion(version: CreativeVersion) {
    const name = window.prompt("Version name", version.name)?.trim();
    if (!name || name === version.name) return;
    await updateProject({
      versions: project.versions.map((item) => item.id === version.id ? { ...item, name } : item),
    });
  }

  async function deleteVersion(version: CreativeVersion) {
    if (version.isOriginal) return;
    const confirmed = window.confirm(`Delete “${version.name}” from this project?`);
    if (!confirmed) return;
    const versions = project.versions.filter((item) => item.id !== version.id);
    const fallback = versions.at(-1);
    await updateProject({
      versions,
      currentVersionId: project.currentVersionId === version.id ? fallback?.id : project.currentVersionId,
      outputDimensions: project.currentVersionId === version.id && fallback ? fallback.dimensions : project.outputDimensions,
    });
    showToast("success", "Version removed from the timeline.");
  }

  async function exportCurrent() {
    if (!asset) return;
    setExporting(true);
    try {
      if (asset.mimeType === "application/pdf") {
        downloadBlob(asset.blob, projectFilename(project, "pdf"));
      } else {
        const blob = await convertImage(asset.blob, EXPORT_TYPES[exportFormat]);
        downloadBlob(blob, projectFilename(project, exportFormat));
      }
      showToast("success", "Export downloaded.");
    } catch (cause) {
      showToast("error", cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  function stepVersion(offset: number) {
    const version = project.versions[currentIndex + offset];
    if (version) void restoreVersion(version);
  }

  return (
    <main className="workspace">
      <header className="workspace-topbar">
        <div className="workspace-topbar__project">
          <IconButton label="Back to projects" onClick={onBack}><ArrowLeft size={18} /></IconButton>
          <div className="workspace-topbar__divider" />
          <div>
            <div className="workspace-topbar__name"><strong>{project.name}</strong><ChevronDown size={14} /></div>
            <span><Check size={11} /> Saved locally</span>
          </div>
        </div>
        <div className="workspace-topbar__actions">
          <div className="history-controls">
            <IconButton label="Previous version" disabled={currentIndex <= 0} onClick={() => stepVersion(-1)}><Undo2 size={17} /></IconButton>
            <IconButton label="Next version" disabled={currentIndex < 0 || currentIndex >= project.versions.length - 1} onClick={() => stepVersion(1)}><Redo2 size={17} /></IconButton>
          </div>
          <input
            ref={uploadInput}
            hidden
            type="file"
            accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadAsset(file);
              event.target.value = "";
            }}
          />
          {asset ? <Button icon={<Upload size={15} />} onClick={() => uploadInput.current?.click()}>Add source</Button> : null}
          <div className="export-control">
            <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as keyof typeof EXPORT_TYPES)} disabled={!asset || asset.mimeType === "application/pdf"}>
              <option value="png">PNG</option><option value="jpg">JPG</option><option value="webp">WEBP</option>
            </select>
            <Button variant="primary" icon={<Download size={15} />} busy={exporting} disabled={!asset} onClick={exportCurrent}>Export</Button>
          </div>
        </div>
      </header>

      <div className="workspace-body">
        <div className="workspace-center">
          <div className="project-context-bar">
            <label>
              <span>Brand</span>
              <select value={project.brand} onChange={(event) => void updateProject({ brand: event.target.value })}>
                {BRANDS.map((brand) => <option key={brand}>{brand}</option>)}
              </select>
            </label>
            <label>
              <span>Campaign</span>
              <input value={project.campaign} placeholder="Add campaign" onChange={(event) => void updateProject({ campaign: event.target.value })} />
            </label>
            <div className="project-context-bar__status"><Save size={13} /> Original retained</div>
          </div>
          <CreativeCanvas
            asset={asset}
            assetUrl={assetUrl}
            version={currentVersion}
            loading={assetLoading}
            onUpload={uploadAsset}
          />
        </div>

        <aside className="workspace-inspector">
          <div className="inspector-tabs">
            <button className={inspectorTab === "assistant" ? "is-active" : ""} onClick={() => setInspectorTab("assistant")}><MessageSquareText size={16} /> Assistant</button>
            <button className={inspectorTab === "output" ? "is-active" : ""} onClick={() => setInspectorTab("output")}><Settings2 size={16} /> Output</button>
            <button className={inspectorTab === "history" ? "is-active" : ""} onClick={() => setInspectorTab("history")}><History size={16} /> History</button>
          </div>
          {inspectorTab === "assistant" ? (
            <ChatPanel revisions={project.revisions} disabled={!asset} busy={assistantBusy} onSubmit={submitInstruction} />
          ) : inspectorTab === "output" ? (
            <DimensionPicker
              value={project.outputDimensions}
              recent={project.recentCustomDimensions}
              disabled={!asset}
              onChange={(dimensions, remember) => void changeDimensions(dimensions, remember)}
              onCreate={createResize}
            />
          ) : (
            <VersionHistory
              versions={project.versions}
              currentVersionId={project.currentVersionId}
              onRestore={(version) => void restoreVersion(version)}
              onDuplicate={duplicateVersion}
              onRename={(version) => void renameVersion(version)}
              onDelete={(version) => void deleteVersion(version)}
            />
          )}
        </aside>
      </div>

      {toast ? (
        <div className={`toast toast--${toast.tone}`}>
          {toast.tone === "success" ? <Check size={16} /> : <PanelRight size={16} />}
          <span>{toast.message}</span>
          <IconButton label="Dismiss" onClick={() => setToast(undefined)}><X size={14} /></IconButton>
        </div>
      ) : null}
    </main>
  );
}
