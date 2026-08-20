import type {
  CreativeActionRequest,
  CreativeActionResult,
  Dimensions,
} from "@/lib/types";
import type { ImageProvider } from "@/services/image-provider";

const DIMENSION_PATTERN = /\b(\d{2,4})\s*[x×]\s*(\d{2,4})\b/i;

function requestedDimensions(instruction: string) {
  const match = instruction.match(DIMENSION_PATTERN);
  if (!match) return undefined;
  return { width: Number(match[1]), height: Number(match[2]) };
}

export class MockImageProvider implements ImageProvider {
  readonly name = "mock";

  async generateImage(): Promise<CreativeActionResult> {
    return {
      intent: "edit",
      actionLabel: "Starting concept",
      message: "A mock starting concept was added to the project history.",
    };
  }

  async editImage(request: CreativeActionRequest): Promise<CreativeActionResult> {
    const dimensions = requestedDimensions(request.instruction);
    if (dimensions) return this.resizeCreative(request, dimensions);
    if (/\b(three|3)\b.*\b(variation|version)/i.test(request.instruction)) {
      return this.createVariation();
    }
    return {
      intent: "edit",
      actionLabel: request.instruction.slice(0, 48),
      message:
        "Created a non-destructive mock revision. Its version lineage is real; semantic pixel editing will be enabled by the Phase 2 provider.",
    };
  }

  async createVariation(): Promise<CreativeActionResult> {
    return {
      intent: "variation",
      variationCount: 3,
      actionLabel: "Three variations",
      message: "Created three independent mock variations for workflow review.",
    };
  }

  async resizeCreative(
    _request: CreativeActionRequest,
    dimensions: Dimensions,
  ): Promise<CreativeActionResult> {
    return {
      intent: "resize",
      dimensions,
      actionLabel: `Recomposed to ${dimensions.width} × ${dimensions.height}`,
      message:
        "Recomposed the asset without stretching it, preserving the complete source design within the new canvas.",
    };
  }

  async analyzeCreative(): Promise<CreativeActionResult> {
    return {
      intent: "analyze",
      actionLabel: "Style analysis",
      message: "Style profiles are prepared for Phase 3 and are not simulated as model training.",
    };
  }
}
