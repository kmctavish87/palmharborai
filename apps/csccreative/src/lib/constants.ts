import type { Dimensions } from "@/lib/types";

export const BRANDS = [
  "CSC ServiceWorks",
  "Appliance Warehouse",
  "One Tap Away",
  "Laundry Rewards",
  "Laundry Pass",
] as const;

export interface DimensionPreset extends Dimensions {
  label: string;
  channel: "Social" | "Display" | "Email";
}

export const DIMENSION_PRESETS: DimensionPreset[] = [
  { label: "Square", width: 1080, height: 1080, channel: "Social" },
  { label: "Portrait", width: 1080, height: 1350, channel: "Social" },
  { label: "Stories", width: 1080, height: 1920, channel: "Social" },
  { label: "Landscape", width: 1200, height: 628, channel: "Social" },
  { label: "Square XL", width: 1200, height: 1200, channel: "Social" },
  { label: "Medium rectangle", width: 300, height: 250, channel: "Display" },
  { label: "Large rectangle", width: 336, height: 280, channel: "Display" },
  { label: "Leaderboard", width: 728, height: 90, channel: "Display" },
  { label: "Half page", width: 300, height: 600, channel: "Display" },
  { label: "Wide skyscraper", width: 160, height: 600, channel: "Display" },
  { label: "Mobile banner", width: 320, height: 50, channel: "Display" },
  { label: "Billboard", width: 970, height: 250, channel: "Display" },
  { label: "Email banner", width: 1200, height: 400, channel: "Email" },
];

export const QUICK_ACTIONS = [
  "Create 3 variations",
  "Make the headline more prominent",
  "Move the CTA higher",
  "Simplify the layout",
  "Make more on-brand",
  "Create a social version",
];

export const NAV_ITEMS = [
  { id: "projects", label: "Projects" },
  { id: "new", label: "New creative" },
  { id: "references", label: "Reference library", phase: "03" },
  { id: "brands", label: "Brand library", phase: "03" },
  { id: "logos", label: "Logo exporter", phase: "04" },
  { id: "settings", label: "Settings" },
] as const;
