import type { CreativeActionRequest, CreativeActionResult, Dimensions } from "@/lib/types";
import type { ImageProvider } from "@/services/image-provider";

async function imageRequest(request: CreativeActionRequest, action: "generate" | "edit") {
  const form = new FormData();
  form.set("action", action);
  form.set("instruction", request.instruction);
  form.set("projectName", request.projectName);
  form.set("brand", request.brand);
  form.set("campaign", request.campaign);
  form.set("brandContext", request.brandContext ?? "");
  form.set("brief", request.brief ? JSON.stringify(request.brief) : "");
  form.set("quality", request.imageQuality ?? "medium");
  if (request.outputDimensions) {
    form.set("width", String(request.outputDimensions.width));
    form.set("height", String(request.outputDimensions.height));
  }
  if (request.sourceImage) form.set("image", request.sourceImage, "current-creative.png");
  request.referenceImages?.slice(0, 3).forEach((blob, index) => form.append("reference", blob, `reference-${index + 1}.png`));
  const response = await fetch("/api/csccreative/image", {
    method: "POST",
    headers: request.accessCode ? { "x-csc-access-code": request.accessCode } : undefined,
    body: form,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `The image service returned ${response.status}.`);
  }
  const imageBlob = await response.blob();
  return {
    imageBlob,
    provider: "openai" as const,
    actionLabel: response.headers.get("x-creative-action") ?? (action === "generate" ? "Generated concept" : "AI revision"),
    message: response.headers.get("x-creative-message") ?? "Created with the configured OpenAI image provider.",
  };
}

export class OpenAIImageProvider implements ImageProvider {
  readonly name = "openai";

  async generateImage(request: CreativeActionRequest): Promise<CreativeActionResult> {
    return { intent: "edit", ...(await imageRequest(request, "generate")) };
  }

  async editImage(request: CreativeActionRequest): Promise<CreativeActionResult> {
    return { intent: "edit", ...(await imageRequest(request, request.sourceImage ? "edit" : "generate")) };
  }

  async createVariation(request: CreativeActionRequest): Promise<CreativeActionResult> {
    return { intent: "variation", ...(await imageRequest(request, request.sourceImage ? "edit" : "generate")) };
  }

  async resizeCreative(request: CreativeActionRequest, dimensions: Dimensions): Promise<CreativeActionResult> {
    return { intent: "resize", dimensions, ...(await imageRequest({ ...request, outputDimensions: dimensions }, request.sourceImage ? "edit" : "generate")) };
  }

  async analyzeCreative(): Promise<CreativeActionResult> {
    return { intent: "analyze", actionLabel: "Style analysis", message: "Style analysis is stored as editable guidance in the Reference Library." };
  }
}
