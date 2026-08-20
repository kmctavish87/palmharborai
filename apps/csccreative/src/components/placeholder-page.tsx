import { ArrowLeft, Blocks } from "lucide-react";

import { Button } from "@/components/ui";

const CONTENT: Record<string, { eyebrow: string; title: string; text: string; phase: string }> = {
  references: {
    eyebrow: "Creative intelligence",
    title: "Reference library",
    text: "Organize approved examples as private, opt-in style context—never automatic model training.",
    phase: "Phase 3",
  },
  brands: {
    eyebrow: "Brand governance",
    title: "Brand library",
    text: "Logos, colors, guidance, messaging, and required disclaimers will live here.",
    phase: "Phase 3",
  },
  logos: {
    eyebrow: "Self-service production",
    title: "Logo exporter",
    text: "A permission-ready utility for approved logo variants, canvas sizes, padding, and formats.",
    phase: "Phase 4",
  },
  settings: {
    eyebrow: "Workspace controls",
    title: "Settings",
    text: "Provider configuration, storage, and role controls will appear here as the prototype moves into production.",
    phase: "Foundation",
  },
};

export function PlaceholderPage({ page, onBack }: { page: string; onBack: () => void }) {
  const content = CONTENT[page] ?? CONTENT.settings;
  return (
    <main className="placeholder-page">
      <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onBack}>Back to projects</Button>
      <div className="placeholder-card">
        <div className="placeholder-card__icon"><Blocks size={30} /></div>
        <p className="eyebrow">{content.eyebrow}</p>
        <h1>{content.title}</h1>
        <p>{content.text}</p>
        <span>{content.phase}</span>
      </div>
    </main>
  );
}
