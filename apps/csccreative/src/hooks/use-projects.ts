"use client";

import { useCallback, useEffect, useState } from "react";

import type { CreativeProject } from "@/lib/types";
import {
  listProjects,
  removeAssetsForProject,
  removeProject,
  saveProject,
} from "@/lib/storage";

export function useProjects() {
  const [projects, setProjects] = useState<CreativeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    listProjects()
      .then((records) => {
        if (active) setProjects(records);
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Projects could not be loaded.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback(async (project: CreativeProject) => {
    await saveProject(project);
    setProjects((current) =>
      [project, ...current.filter((item) => item.id !== project.id)].sort(
        (a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime(),
      ),
    );
    return project;
  }, []);

  const destroy = useCallback(async (id: string) => {
    await removeProject(id);
    await removeAssetsForProject(id);
    setProjects((current) => current.filter((project) => project.id !== id));
  }, []);

  return { projects, loading, error, persist, destroy };
}
