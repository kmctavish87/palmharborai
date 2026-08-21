import type { AppSettings, BrandProfile } from "@/lib/types";

const UPDATED_AT = "2026-08-21T12:00:00.000Z";

export const DEFAULT_SETTINGS: AppSettings = {
  id: "app",
  role: "designer",
  providerMode: "mock",
  imageQuality: "medium",
  autoFallback: true,
};

export const DEFAULT_BRANDS: BrandProfile[] = [
  {
    id: "brand-csc",
    name: "CSC ServiceWorks",
    colors: ["#003B2D", "#F47B45", "#C9F4DE", "#FFFFFF"],
    fonts: ["Manrope", "Arial"],
    approvedMessaging: "Reliable, convenient laundry and air services for everyday communities.",
    prohibitedMessaging: "Avoid guarantees about uptime, savings, or service availability.",
    disclaimers: "Availability, pricing, and features may vary by location.",
    ctaConventions: "Use direct, action-led CTAs such as Learn more, Get started, or Download the app.",
    notes: "Lead with clarity and practical benefit. Use confident, human language.",
    logoAssetIds: [],
    exampleAssetIds: [],
    updatedAt: UPDATED_AT,
  },
  {
    id: "brand-appliance-warehouse",
    name: "Appliance Warehouse",
    colors: ["#0B4666", "#F28A3A", "#EAF3F8", "#FFFFFF"],
    fonts: ["Manrope", "Arial"],
    approvedMessaging: "Easy appliance rental with dependable delivery and support.",
    prohibitedMessaging: "Do not imply same-day delivery or universal product availability.",
    disclaimers: "Rental terms, inventory, and service areas vary.",
    ctaConventions: "Prefer Rent today, View appliances, or Check availability.",
    notes: "Product-forward layouts with approachable residential imagery.",
    logoAssetIds: [],
    exampleAssetIds: [],
    updatedAt: UPDATED_AT,
  },
  {
    id: "brand-one-tap-away",
    name: "One Tap Away",
    colors: ["#17243E", "#FF6E47", "#83E3CB", "#FFFFFF"],
    fonts: ["Manrope", "Arial"],
    approvedMessaging: "Laundry access and payment made simple from your phone.",
    prohibitedMessaging: "Avoid claims that every property or machine supports the app.",
    disclaimers: "App features depend on participating locations and equipment.",
    ctaConventions: "Use Download the app, Start a cycle, or See how it works.",
    notes: "Mobile-first, energetic, concise, with a strong single focal point.",
    logoAssetIds: [],
    exampleAssetIds: [],
    updatedAt: UPDATED_AT,
  },
  {
    id: "brand-laundry-rewards",
    name: "Laundry Rewards",
    colors: ["#553B88", "#F0B84B", "#F5F0FF", "#FFFFFF"],
    fonts: ["Manrope", "Arial"],
    approvedMessaging: "Earn more value from participating laundry experiences.",
    prohibitedMessaging: "Do not promise fixed reward value, availability, or expiration terms.",
    disclaimers: "Participation, rewards, and terms vary by location.",
    ctaConventions: "Prefer Join rewards, Start earning, or View benefits.",
    notes: "Celebrate benefits without clutter; use reward cues sparingly.",
    logoAssetIds: [],
    exampleAssetIds: [],
    updatedAt: UPDATED_AT,
  },
  {
    id: "brand-laundry-pass",
    name: "Laundry Pass",
    colors: ["#0E5C57", "#F26B4B", "#E2F5F1", "#FFFFFF"],
    fonts: ["Manrope", "Arial"],
    approvedMessaging: "A simpler way for residents to manage eligible laundry plans.",
    prohibitedMessaging: "Avoid describing the service as unlimited unless the specific plan allows it.",
    disclaimers: "Plan terms, enrollment, and participating properties vary.",
    ctaConventions: "Prefer Explore Laundry Pass, Check eligibility, or Enroll now.",
    notes: "Resident-centered and simple; emphasize ease, routine, and value.",
    logoAssetIds: [],
    exampleAssetIds: [],
    updatedAt: UPDATED_AT,
  },
];

export function brandPromptContext(brand?: BrandProfile) {
  if (!brand) return "No brand profile was selected.";
  return [
    `Brand: ${brand.name}`,
    `Palette: ${brand.colors.join(", ")}`,
    `Fonts: ${brand.fonts.join(", ")}`,
    `Approved messaging: ${brand.approvedMessaging}`,
    `Avoid: ${brand.prohibitedMessaging}`,
    `Required disclaimer: ${brand.disclaimers}`,
    `CTA conventions: ${brand.ctaConventions}`,
    `Brand notes: ${brand.notes}`,
  ].join("\n");
}
