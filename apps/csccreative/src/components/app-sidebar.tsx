"use client";

import {
  Box,
  Frame,
  Images,
  Library,
  Plus,
  Settings,
  Shapes,
} from "lucide-react";

import { NAV_ITEMS } from "@/lib/constants";

const ICONS = {
  projects: Images,
  new: Plus,
  references: Library,
  brands: Shapes,
  logos: Frame,
  settings: Settings,
};

export function AppSidebar({
  active,
  onNavigate,
  role,
}: {
  active: string;
  onNavigate: (id: string) => void;
  role: "designer" | "standard";
}) {
  const navItems = role === "standard"
    ? NAV_ITEMS.filter((item) => ["projects", "logos", "settings"].includes(item.id))
    : NAV_ITEMS;
  return (
    <aside className="app-sidebar">
      <button className="brand-mark" onClick={() => onNavigate("projects")}>
        <span className="brand-mark__icon"><Box size={22} strokeWidth={1.8} /></span>
        <span>
          <strong>CSC</strong>
          <small>Creative Studio</small>
        </span>
      </button>
      <nav className="app-nav" aria-label="Primary navigation">
        <p className="app-nav__label">Workspace</p>
        {navItems.map((item) => {
          const Icon = ICONS[item.id];
          return (
            <button
              key={item.id}
              className={active === item.id ? "app-nav__item is-active" : "app-nav__item"}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="privacy-note">
        <span className="privacy-note__dot" />
        <div>
          <strong>Private workspace</strong>
          <p>Assets stay in this browser and are never used for training.</p>
        </div>
      </div>
      <div className="profile-chip">
        <div className="avatar">KM</div>
        <div>
          <strong>Creative team</strong>
          <small>{role === "designer" ? "Designer access" : "Standard access"}</small>
        </div>
      </div>
    </aside>
  );
}
