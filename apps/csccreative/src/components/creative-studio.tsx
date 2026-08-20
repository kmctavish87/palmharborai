"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";

import type { CreativeProject } from "@/lib/types";
import { useProjects } from "@/hooks/use-projects";
import { AppSidebar } from "@/components/app-sidebar";
import { CreativeWorkspace } from "@/components/creative-workspace";
import { NewProjectModal } from "@/components/new-project-modal";
import { PlaceholderPage } from "@/components/placeholder-page";
import { ProjectDashboard } from "@/components/project-dashboard";

export function CreativeStudio() {
  const { projects, loading, error, persist, destroy } = useProjects();
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

  async function createProject(project: CreativeProject) {
    await persist(project);
    setSelectedProjectId(project.id);
    setPage("projects");
    setCreating(false);
  }

  return (
    <div className="studio-shell">
      <AppSidebar active={selectedProject ? "projects" : page} onNavigate={navigate} />
      <div className="studio-content">
        {error ? <div className="global-error"><AlertCircle size={16} /> {error}</div> : null}
        {selectedProject ? (
          <CreativeWorkspace
            project={selectedProject}
            onUpdate={persist}
            onBack={() => setSelectedProjectId(undefined)}
          />
        ) : page === "projects" ? (
          <ProjectDashboard
            projects={projects}
            loading={loading}
            onCreate={() => setCreating(true)}
            onOpen={(project) => setSelectedProjectId(project.id)}
            onDelete={async (project) => { await destroy(project.id); }}
          />
        ) : (
          <PlaceholderPage page={page} onBack={() => setPage("projects")} />
        )}
      </div>
      {creating ? <NewProjectModal onClose={() => setCreating(false)} onCreate={createProject} /> : null}
    </div>
  );
}
