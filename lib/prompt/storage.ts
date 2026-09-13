/**
 * localStorage persistence.
 *
 * Single versioned blob, read once on mount and written back debounced.
 * Every access is wrapped: private browsing, disabled storage and quota
 * errors must degrade to an in-memory session rather than a broken app.
 */

import { SAMPLE_PROJECT_ID, emptyDraft, emptyProject, emptyProjectDraft, sampleDraft, sampleProject } from "./defaults";
import type { PersistedState, ProjectDraft } from "./types";

const KEY = "figma-prompt-builder.v1";

export function initialState(): PersistedState {
  return {
    version: 1,
    projects: [sampleProject()],
    savedPrompts: [],
    draft: sampleDraft(),
    settings: { defaultProjectId: SAMPLE_PROJECT_ID },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Shallow-merge a stored blob over the defaults. Anything missing or of
 * the wrong shape falls back, so a stale payload from an earlier build
 * can never white-screen the app.
 */
export function reviveState(raw: unknown): PersistedState {
  const base = initialState();
  if (!isRecord(raw)) return base;

  /**
   * Fields added after a payload was written (v1.1 added
   * guidelinesInstalled) must be filled in, not left undefined.
   */
  const projects = Array.isArray(raw.projects)
    ? (raw.projects as PersistedState["projects"])
        .filter(isRecord)
        .map((project) => ({ ...emptyProject(), ...project, grid: { ...emptyProject().grid, ...(project.grid ?? {}) } }))
    : base.projects;
  const savedPrompts = Array.isArray(raw.savedPrompts)
    ? (raw.savedPrompts as PersistedState["savedPrompts"]).filter(isRecord)
    : [];
  const settings = isRecord(raw.settings) ? { ...base.settings, ...(raw.settings as object) } : base.settings;

  const safeProjects = projects.length > 0 ? projects : base.projects;
  const draft = isRecord(raw.draft) ? reviveDraft(raw.draft, safeProjects[0].id) : base.draft;

  return { version: 1, projects: safeProjects, savedPrompts, draft, settings };
}

/**
 * Earlier versions kept one flat set of briefs on the draft. Those are
 * migrated onto the project they were written against, so upgrading
 * never loses work and never spreads it across other projects.
 */
function reviveDraft(raw: Record<string, unknown>, fallbackProjectId: string): PersistedState["draft"] {
  const projectId = typeof raw.projectId === "string" && raw.projectId ? raw.projectId : fallbackProjectId;
  const base = emptyDraft(projectId);

  const drafts: Record<string, ProjectDraft> = {};
  if (isRecord(raw.drafts)) {
    for (const [id, value] of Object.entries(raw.drafts)) {
      if (isRecord(value)) drafts[id] = { ...emptyProjectDraft(), ...(value as object) };
    }
  } else {
    const legacy = ["newScreen", "reference", "refine", "qa"].filter((key) => isRecord(raw[key]));
    if (legacy.length > 0) {
      drafts[projectId] = {
        ...emptyProjectDraft(),
        ...Object.fromEntries(legacy.map((key) => [key, raw[key]])),
      } as ProjectDraft;
    }
  }
  if (!drafts[projectId]) drafts[projectId] = emptyProjectDraft();

  return {
    ...base,
    mode: typeof raw.mode === "string" ? (raw.mode as PersistedState["draft"]["mode"]) : base.mode,
    projectId,
    guardrails: typeof raw.guardrails === "boolean" ? raw.guardrails : base.guardrails,
    detail: typeof raw.detail === "string" ? (raw.detail as PersistedState["draft"]["detail"]) : base.detail,
    drafts,
  };
}

export function loadState(): PersistedState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initialState();
    return reviveState(JSON.parse(raw));
  } catch {
    return initialState();
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable or full — keep working in memory */
  }
}
