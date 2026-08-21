import type { Dimensions } from "@/lib/types";

const MAX_DIMENSION = 6000;

export function validateDimensions(dimensions: Dimensions) {
  if (
    !Number.isInteger(dimensions.width) ||
    !Number.isInteger(dimensions.height) ||
    dimensions.width < 16 ||
    dimensions.height < 16 ||
    dimensions.width > MAX_DIMENSION ||
    dimensions.height > MAX_DIMENSION
  ) {
    throw new Error("Dimensions must be whole numbers between 16 and 6000 pixels.");
  }
}

export async function readImageDimensions(blob: Blob): Promise<Dimensions> {
  if (blob.type === "application/pdf") return { width: 0, height: 0 };
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadImage(url);
    return { width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be decoded."));
    image.src = url;
  });
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function drawContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  padding: number,
) {
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2;
  const scale = Math.min(
    availableWidth / image.naturalWidth,
    availableHeight / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality = 0.94) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image encoding failed."))),
      type,
      quality,
    );
  });
}

export async function smartResizeImage(
  source: Blob,
  dimensions: Dimensions,
  mimeType = "image/png",
) {
  validateDimensions(dimensions);
  if (source.type === "application/pdf") {
    throw new Error("PDF recomposition is planned for a later phase.");
  }

  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this browser.");

    const sourceRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = dimensions.width / dimensions.height;
    const ratioDelta = Math.abs(sourceRatio - targetRatio) / sourceRatio;

    if (ratioDelta < 0.09) {
      drawCover(context, image, dimensions.width, dimensions.height);
    } else {
      context.save();
      context.filter = `blur(${Math.max(14, Math.round(Math.min(dimensions.width, dimensions.height) * 0.03))}px)`;
      context.globalAlpha = 0.34;
      drawCover(context, image, dimensions.width, dimensions.height);
      context.restore();
      context.fillStyle = "rgba(248, 249, 246, 0.76)";
      context.fillRect(0, 0, dimensions.width, dimensions.height);
      const padding = Math.max(8, Math.round(Math.min(dimensions.width, dimensions.height) * 0.055));
      drawContain(context, image, dimensions.width, dimensions.height, padding);
    }

    return canvasBlob(canvas, mimeType);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function convertImage(source: Blob, mimeType: string) {
  if (source.type === mimeType) return source.slice(0, source.size, mimeType);
  const dimensions = await readImageDimensions(source);
  return smartResizeImage(source, dimensions, mimeType);
}

export async function exportLogoImage(
  source: Blob,
  dimensions: Dimensions,
  options: {
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    background: "transparent" | "white";
    padding: number;
    mode: "fit" | "exact";
  },
) {
  validateDimensions(dimensions);
  const url = URL.createObjectURL(source);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this browser.");
    if (options.background === "white" || options.mimeType === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, dimensions.width, dimensions.height);
    }
    const maxPadding = Math.max(0, Math.floor(Math.min(dimensions.width, dimensions.height) / 2) - 1);
    const padding = Math.min(Math.max(0, options.padding), maxPadding);
    if (options.mode === "exact") {
      context.drawImage(image, padding, padding, dimensions.width - padding * 2, dimensions.height - padding * 2);
    } else {
      drawContain(context, image, dimensions.width, dimensions.height, padding);
    }
    return canvasBlob(canvas, options.mimeType);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createBriefConceptImage(
  dimensions: Dimensions,
  content: { brand: string; headline: string; offer: string; cta: string; colors: string[] },
) {
  validateDimensions(dimensions);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable in this browser.");
  const [primary = "#123b2b", accent = "#f07a44", soft = "#c9f4de"] = content.colors;
  context.fillStyle = primary;
  context.fillRect(0, 0, dimensions.width, dimensions.height);
  const unit = Math.min(dimensions.width, dimensions.height);
  context.fillStyle = soft;
  context.beginPath();
  context.arc(dimensions.width * 0.86, dimensions.height * 0.12, unit * 0.34, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.16;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(dimensions.width * 0.82, dimensions.height * 0.78, unit * 0.43, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  const pad = dimensions.width * 0.075;
  const headline = content.headline || content.offer || "Starting creative concept";
  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.max(28, Math.round(unit * 0.085))}px Arial`;
  context.textBaseline = "top";
  const maxWidth = dimensions.width * 0.68;
  const words = headline.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  lines.slice(0, 4).forEach((item, index) => context.fillText(item, pad, dimensions.height * 0.23 + index * unit * 0.105));
  context.fillStyle = "rgba(255,255,255,.78)";
  context.font = `600 ${Math.max(12, Math.round(unit * 0.026))}px Arial`;
  context.fillText(content.brand, pad, pad);
  if (content.offer) context.fillText(content.offer.slice(0, 70), pad, dimensions.height * 0.69);
  context.fillStyle = accent;
  const buttonWidth = Math.min(dimensions.width * 0.42, Math.max(160, context.measureText(content.cta || "Learn more").width + unit * 0.1));
  const buttonHeight = Math.max(44, unit * 0.075);
  context.beginPath();
  context.roundRect(pad, dimensions.height * 0.78, buttonWidth, buttonHeight, buttonHeight / 2);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.max(13, Math.round(unit * 0.025))}px Arial`;
  context.textBaseline = "middle";
  context.fillText(content.cta || "Learn more", pad + buttonHeight * 0.45, dimensions.height * 0.78 + buttonHeight / 2);
  return canvasBlob(canvas, "image/png");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
