"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

import type { CreativeProject } from "@/lib/types";
import { useProjects } from "@/hooks/use-projects";
import { useCreativeLibrary } from "@/hooks/use-creative-library";
import { AppSidebar } from "@/components/app-sidebar";
import { BrandLibrary } from "@/components/brand-library";
import { CreativeWorkspace } from "@/components/creative-workspace";
import { LogoExporter } from "@/components/logo-exporter";
import { NewProjectModal } from "@/components/new-project-modal";
import { ProjectDashboard } from "@/components/project-dashboard";
import { ReferenceLibrary } from "@/components/reference-library";
import { SettingsPage } from "@/components/settings-page";

export function CreativeStudio() {
  const { projects, loading, error, persist, destroy } = useProjects();
  const library = useCreativeLibrary();
  const [page, setPage] = useState("projects");
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [creating, setCreating] = useState(false);
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  );

  function navigate(next: string) {
    if (next === "new") {
      setCreating(true);
      return;
    }
    setSelectedProjectId(undefined);
    setPage(next);
  }

  const canDesign = library.settings.role === "designer";

  async function createProject(project: CreativeProject) {
    await persist(project);
    setSelectedProjectId(project.id);
    setPage("projects");
    setCreating(false);
  }

  return (
    <div className="studio-shell">
      <AppSidebar active={selectedProject ? "projects" : page} onNavigate={navigate} role={library.settings.role} />
      <div className="studio-content">
        {error || library.error ? <div className="global-error"><AlertCircle size={16} /> {error ?? library.error}</div> : null}
        {selectedProject ? (
          <CreativeWorkspace
            project={selectedProject}
            brands={library.brands}
            references={library.references}
            styleProfiles={library.styleProfiles}
            settings={library.settings}
            onUpdate={persist}
            onBack={() => setSelectedProjectId(undefined)}
          />
        ) : page === "projects" ? (
          <ProjectDashboard
            projects={projects}
            loading={loading}
            onCreate={() => canDesign && setCreating(true)}
            onOpen={(project) => setSelectedProjectId(project.id)}
            onDelete={async (project) => { await destroy(project.id); }}
            role={library.settings.role}
            onOpenLogoExporter={() => setPage("logos")}
          />
        ) : page === "references" && canDesign ? (
          <ReferenceLibrary brands={library.brands} references={library.references} profiles={library.styleProfiles} onSaveReference={library.saveReference} onRemoveReference={library.removeReference} onSaveProfile={library.saveStyleProfile} />
        ) : page === "brands" && canDesign ? (
          <BrandLibrary brands={library.brands} onSave={library.saveBrand} />
        ) : page === "logos" ? (
          <LogoExporter brands={library.brands} />
        ) : page === "settings" ? (
          <SettingsPage settings={library.settings} onSave={library.saveSettings} />
        ) : null}
      </div>
      {creating && canDesign ? <NewProjectModal onClose={() => setCreating(false)} onCreate={createProject} /> : null}
    </div>
  );
}
