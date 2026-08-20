import type {
  CreativeActionRequest,
  CreativeActionResult,
  Dimensions,
} from "@/lib/types";

export interface ImageProvider {
  readonly name: string;
  generateImage(request: CreativeActionRequest): Promise<CreativeActionResult>;
  editImage(request: CreativeActionRequest): Promise<CreativeActionResult>;
  createVariation(request: CreativeActionRequest): Promise<CreativeActionResult>;
  resizeCreative(
    request: CreativeActionRequest,
    dimensions: Dimensions,
  ): Promise<CreativeActionResult>;
  analyzeCreative(request: CreativeActionRequest): Promise<CreativeActionResult>;
}
