export type OwnershipType = "corporate" | "personal" | "reference_only";

export interface Dimensions {
  width: number;
  height: number;
}

export interface CreativeVersion {
  id: string;
  assetId: string;
  name: string;
  action: string;
  dimensions: Dimensions;
  createdAt: string;
  sourceVersionId?: string;
  isOriginal?: boolean;
}

export interface Revision {
  id: string;
  instruction: string;
  aiAction: string;
  createdAt: string;
  resultingVersionIds: string[];
  status: "completed" | "failed";
}

export interface CreativeProject {
  id: string;
  name: string;
  brand: string;
  campaign: string;
  createdAt: string;
  modifiedAt: string;
  originalAssetId?: string;
  currentVersionId?: string;
  versions: CreativeVersion[];
  revisions: Revision[];
  outputDimensions: Dimensions;
  recentCustomDimensions: Dimensions[];
}

export interface StoredAsset {
  id: string;
  projectId: string;
  filename: string;
  mimeType: string;
  blob: Blob;
  width: number;
  height: number;
  createdAt: string;
  ownershipType: OwnershipType;
  isOriginal: boolean;
}

export type CreativeIntent =
  | "resize"
  | "variation"
  | "edit"
  | "analyze";

export interface CreativeActionRequest {
  instruction: string;
  currentDimensions?: Dimensions;
  projectName: string;
  brand: string;
  campaign: string;
}

export interface CreativeActionResult {
  intent: CreativeIntent;
  message: string;
  actionLabel: string;
  dimensions?: Dimensions;
  variationCount?: number;
}
