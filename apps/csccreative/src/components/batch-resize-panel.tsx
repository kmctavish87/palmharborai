"use client";

import { useMemo, useState } from "react";
import { Check, Layers3 } from "lucide-react";

import { AssetThumbnail } from "@/components/asset-thumbnail";
import { Button } from "@/components/ui";
import { DIMENSION_PRESETS } from "@/lib/constants";
import type { CreativeVersion, Dimensions } from "@/lib/types";

export function BatchResizePanel({ disabled, busy, results, onCreate, onOpen }: { disabled: boolean; busy: boolean; results: CreativeVersion[]; onCreate: (dimensions: Dimensions[]) => Promise<void>; onOpen: (version: CreativeVersion) => void }) {
  const [selected, setSelected] = useState<string[]>(["1200x628", "1080x1920", "300x250"]);
  const grouped = useMemo(() => ["Social", "Display", "Email"].map((channel) => ({ channel, items: DIMENSION_PRESETS.filter((item) => item.channel === channel) })), []);

  function toggle(width: number, height: number) {
    const key = `${width}x${height}`;
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  return (
    <div className="batch-panel">
      <div className="batch-panel__heading"><span className="batch-icon"><Layers3 size={17} /></span><div><h3>Batch production</h3><p>Select multiple approved sizes from one source.</p></div></div>
      <div className="batch-presets">{grouped.map((group) => <section key={group.channel}><p>{group.channel}</p><div>{group.items.map((item) => { const key = `${item.width}x${item.height}`; return <button key={key} className={selected.includes(key) ? "is-selected" : ""} onClick={() => toggle(item.width, item.height)}><span>{selected.includes(key) ? <Check size={10} /> : null}</span><strong>{item.label}</strong><small>{item.width} × {item.height}</small></button>; })}</div></section>)}</div>
      <Button className="full-width" variant="primary" busy={busy} disabled={disabled || !selected.length} onClick={() => onCreate(selected.map((key) => { const [width, height] = key.split("x").map(Number); return { width, height }; }))}>Create {selected.length} output{selected.length === 1 ? "" : "s"}</Button>
      {results.length ? <div className="batch-results"><div className="batch-results__heading"><strong>Latest batch</strong><span>{results.length} outputs</span></div><div>{results.map((version) => <button key={version.id} onClick={() => onOpen(version)}><AssetThumbnail assetId={version.assetId} alt={version.name} /><span><strong>{version.name}</strong><small>{version.dimensions.width} × {version.dimensions.height}</small></span></button>)}</div></div> : null}
    </div>
  );
}
