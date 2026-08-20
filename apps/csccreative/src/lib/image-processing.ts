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
