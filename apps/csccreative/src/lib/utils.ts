import type { CreativeProject, Dimensions } from "@/lib/types";

export function createId(prefix: string) {
  const uuid = globalThis.crypto?.randomUUID?.() ?? [Date.now().toString(36), Math.random().toString(36).slice(2, 11)].join("-");
  return `${prefix}_${uuid}`;
}

export function formatRelativeDate(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  }).format(date);
}

export function formatDimensions(dimensions: Dimensions) {
  return `${dimensions.width} × ${dimensions.height}`;
}

export function projectFilename(
  project: CreativeProject,
  extension: string,
) {
  const currentIndex = Math.max(
    project.versions.findIndex((version) => version.id === project.currentVersionId) + 1,
    1,
  );
  const raw = [
    project.brand,
    project.campaign || project.name,
    "Creative",
    `${project.outputDimensions.width}x${project.outputDimensions.height}`,
    `V${currentIndex}`,
  ]
    .join("_")
    .replace(/[^a-zA-Z0-9_-]+/g, "")
    .replace(/_+/g, "_");
  return `${raw}.${extension}`;
}

export function dimensionsEqual(a: Dimensions, b: Dimensions) {
  return a.width === b.width && a.height === b.height;
}
