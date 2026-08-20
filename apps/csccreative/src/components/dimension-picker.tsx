"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, RectangleHorizontal, Square, StretchVertical } from "lucide-react";

import { DIMENSION_PRESETS } from "@/lib/constants";
import type { Dimensions } from "@/lib/types";
import { dimensionsEqual, formatDimensions } from "@/lib/utils";
import { Button } from "@/components/ui";

function RatioIcon({ dimensions }: { dimensions: Dimensions }) {
  const ratio = dimensions.width / dimensions.height;
  if (ratio > 1.35) return <RectangleHorizontal size={17} />;
  if (ratio < 0.74) return <StretchVertical size={17} />;
  return <Square size={16} />;
}

export function DimensionPicker({
  value,
  recent,
  disabled,
  onChange,
  onCreate,
}: {
  value: Dimensions;
  recent: Dimensions[];
  disabled?: boolean;
  onChange: (dimensions: Dimensions, remember?: boolean) => void;
  onCreate: () => Promise<void>;
}) {
  const [channel, setChannel] = useState("Social");
  const [custom, setCustom] = useState(false);
  const [width, setWidth] = useState(String(value.width));
  const [height, setHeight] = useState(String(value.height));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const presets = useMemo(
    () => DIMENSION_PRESETS.filter((preset) => preset.channel === channel),
    [channel],
  );

  function applyCustom() {
    const dimensions = { width: Number(width), height: Number(height) };
    if (!Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height) || dimensions.width < 16 || dimensions.height < 16 || dimensions.width > 6000 || dimensions.height > 6000) {
      setError("Use whole numbers from 16–6000 px.");
      return;
    }
    setError(undefined);
    onChange(dimensions, true);
  }

  async function create() {
    setBusy(true);
    try {
      await onCreate();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="inspector-section">
      <div className="inspector-section__heading">
        <div><p className="eyebrow">Output</p><h3>Dimensions</h3></div>
        <span className="dimension-current"><RatioIcon dimensions={value} /> {formatDimensions(value)}</span>
      </div>
      <div className="segment-control">
        {["Social", "Display", "Email"].map((item) => (
          <button key={item} className={channel === item && !custom ? "is-active" : ""} onClick={() => { setChannel(item); setCustom(false); }}>
            {item}
          </button>
        ))}
        <button className={custom ? "is-active" : ""} onClick={() => setCustom(true)}>Custom</button>
      </div>
      {custom ? (
        <div className="custom-dimensions">
          <label><span>Width</span><div><input inputMode="numeric" value={width} onChange={(event) => setWidth(event.target.value)} /><small>px</small></div></label>
          <span className="dimension-x">×</span>
          <label><span>Height</span><div><input inputMode="numeric" value={height} onChange={(event) => setHeight(event.target.value)} /><small>px</small></div></label>
          <Button variant="secondary" onClick={applyCustom}>Apply</Button>
          {error ? <p className="field-error">{error}</p> : null}
          {recent.length ? (
            <div className="recent-sizes">
              <span>Recent</span>
              {recent.slice(0, 3).map((dimensions) => (
                <button key={`${dimensions.width}x${dimensions.height}`} onClick={() => { setWidth(String(dimensions.width)); setHeight(String(dimensions.height)); onChange(dimensions); }}>
                  {dimensions.width} × {dimensions.height}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="preset-select-wrap">
          <select
            className="preset-select"
            value={`${value.width}x${value.height}`}
            onChange={(event) => {
              const preset = DIMENSION_PRESETS.find((item) => `${item.width}x${item.height}` === event.target.value);
              if (preset) onChange(preset);
            }}
          >
            {!presets.some((item) => dimensionsEqual(item, value)) ? (
              <option value={`${value.width}x${value.height}`}>Custom · {formatDimensions(value)}</option>
            ) : null}
            {presets.map((preset) => (
              <option key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
                {preset.label} · {preset.width} × {preset.height}
              </option>
            ))}
          </select>
          <ChevronsUpDown size={15} />
        </div>
      )}
      <div className="dimension-summary">
        <Check size={14} /> Smart fit preserves the full design without stretching
      </div>
      <Button className="full-width" variant="primary" onClick={create} busy={busy} disabled={disabled}>
        Create {value.width} × {value.height} version
      </Button>
    </section>
  );
}
