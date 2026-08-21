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
  brief?: CreativeBrief;
  channel?: string;
  assetType?: string;
  selectedReferenceIds?: string[];
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
  brief?: CreativeBrief;
  brandContext?: string;
  outputDimensions?: Dimensions;
  sourceImage?: Blob;
  referenceImages?: Blob[];
  imageQuality?: ImageQuality;
  accessCode?: string;
}

export interface CreativeActionResult {
  intent: CreativeIntent;
  message: string;
  actionLabel: string;
  dimensions?: Dimensions;
  variationCount?: number;
  imageBlob?: Blob;
  provider?: "mock" | "openai";
}

export interface CreativeBrief {
  objective: string;
  audience: string;
  offer: string;
  headline: string;
  supportingCopy: string;
  cta: string;
  creativeDirection: string;
  channel: string;
  assetType: string;
  description: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  colors: string[];
  fonts: string[];
  approvedMessaging: string;
  prohibitedMessaging: string;
  disclaimers: string;
  ctaConventions: string;
  notes: string;
  logoAssetIds: string[];
  exampleAssetIds: string[];
  updatedAt: string;
}

export interface ReferenceAsset {
  id: string;
  title: string;
  brand: string;
  campaign: string;
  category: string;
  tags: string[];
  notes: string;
  active: boolean;
  assetId: string;
  ownershipType: OwnershipType;
  createdAt: string;
  styleProfileId?: string;
}

export interface CreativeStyleProfile {
  id: string;
  name: string;
  brand: string;
  referenceIds: string[];
  typographyHierarchy: string;
  textPlacement: string;
  whitespace: string;
  imagery: string;
  ctaPlacement: string;
  logoPlacement: string;
  headlineLength: string;
  visualDensity: string;
  layoutPatterns: string;
  brandColorUsage: string;
  updatedAt: string;
}

export type UserRole = "designer" | "standard";
export type ProviderMode = "mock" | "openai";
export type ImageQuality = "low" | "medium" | "high";

export interface AppSettings {
  id: "app";
  role: UserRole;
  providerMode: ProviderMode;
  imageQuality: ImageQuality;
  autoFallback: boolean;
  accessCode?: string;
}
