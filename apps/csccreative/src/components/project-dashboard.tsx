"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Clock3,
  FolderOpen,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";

import type { CreativeProject } from "@/lib/types";
import { formatDimensions, formatRelativeDate } from "@/lib/utils";
import { Button, EmptyState, IconButton, Skeleton } from "@/components/ui";

export function ProjectDashboard({
  projects,
  loading,
  onCreate,
  onOpen,
  onDelete,
  role,
  onOpenLogoExporter,
}: {
  projects: CreativeProject[];
  loading: boolean;
  onCreate: () => void;
  onOpen: (project: CreativeProject) => void;
  onDelete: (project: CreativeProject) => Promise<void>;
  role: "designer" | "standard";
  onOpenLogoExporter: () => void;
}) {
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string>();
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return projects;
    return projects.filter((project) =>
      [project.name, project.brand, project.campaign].join(" ").toLowerCase().includes(normalized),
    );
  }, [projects, query]);

  async function deleteProject(project: CreativeProject) {
    const confirmed = window.confirm(
      `Delete “${project.name}” and all of its locally stored versions? This cannot be undone.`,
    );
    if (!confirmed) return;
    await onDelete(project);
  }

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div>
          <p className="eyebrow">Creative operations</p>
          <h1>Good morning, Kyle.</h1>
          <p>Turn finished ideas into every format your campaign needs.</p>
        </div>
        {role === "designer" ? <Button variant="primary" icon={<Plus size={17} />} onClick={onCreate}>New project</Button> : null}
      </header>

      <section className="dashboard__hero">
        <div className="dashboard__hero-copy">
          <span className="hero-kicker"><Sparkles size={14} /> {role === "designer" ? "Production, accelerated" : "Approved self-service"}</span>
          <h2>{role === "designer" ? <>Your design stays yours.<br />The repetitive work doesn’t.</> : <>The right logo.<br />The right size. Every time.</>}</h2>
          <p>
            {role === "designer" ? "Upload approved creative, recompose it for new channels, and keep every decision in one non-destructive workspace." : "Choose an approved brand asset, set the dimensions you need, and export a protected copy without editing the source."}
          </p>
          <Button variant="primary" icon={<ArrowUpRight size={17} />} onClick={role === "designer" ? onCreate : onOpenLogoExporter}>
            {role === "designer" ? "Start from an asset" : "Open Logo Exporter"}
          </Button>
        </div>
        <div className="format-stack" aria-hidden="true">
          <div className="format-card format-card--story">
            <span>9:16</span><b>Stories</b>
          </div>
          <div className="format-card format-card--square">
            <span>1:1</span><b>Social</b>
          </div>
          <div className="format-card format-card--display">
            <span>728 × 90</span><b>Display</b>
          </div>
          <div className="format-orbit" />
        </div>
      </section>

      <section className="projects-section">
        <div className="section-heading">
          <div>
            <h2>Recent projects</h2>
            <p>{projects.length} {projects.length === 1 ? "workspace" : "workspaces"}</p>
          </div>
          <label className="search-field">
            <Search size={16} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search projects"
            />
          </label>
        </div>

        {loading ? (
          <div className="project-grid">
            {[0, 1, 2].map((item) => <Skeleton className="project-skeleton" key={item} />)}
          </div>
        ) : filtered.length ? (
          <div className="project-grid">
            {filtered.map((project, index) => (
              <article className="project-card" key={project.id}>
                <button className="project-card__main" onClick={() => onOpen(project)}>
                  <div className={`project-card__preview project-card__preview--${(index % 3) + 1}`}>
                    <div className="project-card__art">
                      <span>{project.brand.split(" ").slice(0, 2).join(" ")}</span>
                      <b>{project.name}</b>
                    </div>
                    <span className="project-card__dimension">
                      {formatDimensions(project.outputDimensions)}
                    </span>
                  </div>
                  <div className="project-card__body">
                    <div>
                      <h3>{project.name}</h3>
                      <p>{project.brand}{project.campaign ? ` · ${project.campaign}` : ""}</p>
                    </div>
                    <div className="project-card__meta">
                      <span><Clock3 size={13} /> {formatRelativeDate(project.modifiedAt)}</span>
                      <span>{project.versions.length} {project.versions.length === 1 ? "version" : "versions"}</span>
                    </div>
                  </div>
                </button>
                <div className="project-card__menu">
                  <IconButton label="Project actions" onClick={() => setOpenMenu(openMenu === project.id ? undefined : project.id)}>
                    <MoreHorizontal size={18} />
                  </IconButton>
                  {openMenu === project.id ? (
                    <div className="context-menu">
                      <button onClick={() => onOpen(project)}><FolderOpen size={15} /> Open</button>
                      <button className="is-danger" onClick={() => deleteProject(project)}><Trash2 size={15} /> Delete</button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<LayoutGrid size={24} />}
            title={query ? "No projects match" : "Your first project starts here"}
            description={query ? "Try another project, brand, or campaign name." : "Create a workspace, upload an approved asset, and produce the formats you need."}
            action={!query && role === "designer" ? <Button variant="primary" icon={<Plus size={16} />} onClick={onCreate}>Create a project</Button> : undefined}
          />
        )}
      </section>
    </main>
  );
}
