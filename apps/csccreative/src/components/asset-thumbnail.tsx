"use client";

import { useEffect, useState } from "react";
import { FileImage } from "lucide-react";

import { getAsset } from "@/lib/storage";

export function AssetThumbnail({ assetId, alt, className = "" }: { assetId?: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!assetId) return;
    let active = true;
    let objectUrl: string | undefined;
    getAsset(assetId).then((asset) => {
      if (!active || !asset || asset.mimeType === "application/pdf") return;
      objectUrl = URL.createObjectURL(asset.blob);
      setUrl(objectUrl);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId]);

  return (
    <div className={`asset-thumbnail ${className}`}>
      {/* Blob URLs are local IndexedDB assets and cannot use the Next image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt={alt} /> : <FileImage size={24} />}
    </div>
  );
}
