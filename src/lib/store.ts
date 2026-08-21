"use client";

import { useCallback, useEffect, useState } from "react";
import { Project, SEED_PROJECTS } from "./data";

const KEY = "sodatsu.projects";

function load(): Project[] {
  if (typeof window === "undefined") return SEED_PROJECTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return SEED_PROJECTS;
    return JSON.parse(raw) as Project[];
  } catch {
    return SEED_PROJECTS;
  }
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);

  useEffect(() => {
    setProjects(load());
  }, []);

  const save = useCallback((next: Project[]) => {
    setProjects(next);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const add = useCallback(
    (p: Project) => {
      const next = [p, ...(load() ?? [])];
      save(next);
    },
    [save]
  );

  const move = useCallback(
    (id: string, status: Project["status"]) => {
      const next = load().map((p) => (p.id === id ? { ...p, status } : p));
      save(next);
    },
    [save]
  );

  return { projects, add, move };
}
