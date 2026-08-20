import type { StoredAsset } from "@/lib/types";

export interface AssetSearchQuery {
  brand?: string;
  tags?: string[];
  text?: string;
}

export interface AssetRepository {
  searchAssets(query: AssetSearchQuery): Promise<StoredAsset[]>;
  getAsset(id: string): Promise<StoredAsset | undefined>;
  listLogos(brand?: string): Promise<StoredAsset[]>;
  uploadAsset(asset: StoredAsset): Promise<void>;
  getBrandAssets(brand: string): Promise<StoredAsset[]>;
}

// Phase 1 uses the IndexedDB functions in lib/storage. This contract is the seam
// for the future CSC repository or an S3/Supabase implementation.
