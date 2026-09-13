"use client";

/**
 * The workspace: brief on the left, live prompt on the right, one piece
 * of state for both. Everything persists to localStorage, so the app is
 * hydrated from an in-memory default first and swapped to stored state
 * on mount — server and first client render must agree.
 */

import { BookOpen, FolderOpen, Plus, RotateCcw, Save, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  emptyNewScreen,
  emptyProjectDraft,
  emptyQA,
  emptyReference,
  emptyRefine,
  newId,
  sampleNewScreenBrief,
} from "@/lib/prompt/defaults";
import { detectConflicts } from "@/lib/prompt/conflicts";
import { isBriefEmpty } from "@/lib/prompt/emptiness";
import { MODES } from "@/lib/prompt/options";
import { briefFor, compileDraft, contextFor, projectDraft } from "@/lib/prompt/prompts";
import { evaluateReadiness } from "@/lib/prompt/readiness";
import { getServerSnapshot, getSnapshot, subscribe, updateState } from "@/lib/prompt/store";
import type {
  ContextMode,
  DetailLevel,
  Draft,
  NewScreenBrief,
  ProjectDraft,
  ProjectProfile,
  PromptMode,
  QABrief,
  ReferenceBrief,
  RefineBrief,
  SavedPrompt,
} from "@/lib/prompt/types";
import { NewScreenForm, QAForm, ReferenceForm, RefineForm } from "./forms";
import { GuidelinesModal } from "./GuidelinesModal";
import { ProjectsModal } from "./ProjectsModal";
import { PromptPanel, ReadinessPill } from "./PromptPanel";
import { SavedPromptsModal } from "./SavedPromptsModal";
import { Button, Modal, Segmented } from "./ui";

interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}

function deriveTitle(draft: Draft, current: ProjectDraft): string {
  switch (draft.mode) {
    case "new-screen":
      return current.newScreen.screenName.trim() || current.newScreen.screenType.trim() || "Untitled screen";
    case "reference":
      return current.reference.targetScreen.trim()
        ? `Reference — ${current.reference.targetScreen.trim()}`
        : "Reference translation";
    case "refine":
      return current.refine.areaBeingChanged.trim()
        ? `Refine — ${current.refine.areaBeingChanged.trim()}`
        : current.refine.frameName.trim() || "Refinement";
    case "qa":
      return current.qa.frameName.trim() ? `QA — ${current.qa.frameName.trim()}` : "Design QA";
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path below */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function Workspace() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const [view, setView] = useState<"brief" | "prompt">("brief");
  const [dialog, setDialog] = useState<"projects" | "saved" | "guidelines" | null>(null);
  const [activeSavedId, setActiveSavedId] = useState<string | null>(null);
  const [lastSavedPrompt, setLastSavedPrompt] = useState("");
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const { draft, projects, savedPrompts } = state;
  const project: ProjectProfile | null =
    projects.find((entry) => entry.id === draft.projectId) ?? projects[0] ?? null;

  /** Only this project's briefs are ever read or written. */
  const current = useMemo(() => projectDraft(draft), [draft]);
  const promptContext = useMemo(() => contextFor(draft, project), [draft, project]);
  const briefEmpty = useMemo(() => isBriefEmpty(draft), [draft]);
  const prompt = useMemo(() => (briefEmpty ? "" : compileDraft(draft, project)), [briefEmpty, draft, project]);
  const conflicts = useMemo(() => detectConflicts(draft, project, projects), [draft, project, projects]);
  const readiness = useMemo(() => evaluateReadiness(draft, project, conflicts), [conflicts, draft, project]);

  const patchDraft = useCallback((patch: Partial<Draft>) => {
    updateState((state) => ({ ...state, draft: { ...state.draft, ...patch } }));
  }, []);

  /** Write into the active project's draft, creating it on first touch. */
  const patchProjectDraft = useCallback((patch: Partial<ProjectDraft>) => {
    updateState((state) => {
      const id = state.draft.projectId;
      const existing = state.draft.drafts[id] ?? emptyProjectDraft();
      return {
        ...state,
        draft: { ...state.draft, drafts: { ...state.draft.drafts, [id]: { ...existing, ...patch } } },
      };
    });
  }, []);

  const patchNewScreen = useCallback(
    (patch: Partial<NewScreenBrief>) => {
      updateState((state) => {
        const id = state.draft.projectId;
        const existing = state.draft.drafts[id] ?? emptyProjectDraft();
        return {
          ...state,
          draft: {
            ...state.draft,
            drafts: { ...state.draft.drafts, [id]: { ...existing, newScreen: { ...existing.newScreen, ...patch } } },
          },
        };
      });
    },
    [],
  );

  const patchReference = useCallback((patch: Partial<ReferenceBrief>) => {
    updateState((state) => {
      const id = state.draft.projectId;
      const existing = state.draft.drafts[id] ?? emptyProjectDraft();
      return {
        ...state,
        draft: {
          ...state.draft,
          drafts: { ...state.draft.drafts, [id]: { ...existing, reference: { ...existing.reference, ...patch } } },
        },
      };
    });
  }, []);

  const patchRefine = useCallback((patch: Partial<RefineBrief>) => {
    updateState((state) => {
      const id = state.draft.projectId;
      const existing = state.draft.drafts[id] ?? emptyProjectDraft();
      return {
        ...state,
        draft: {
          ...state.draft,
          drafts: { ...state.draft.drafts, [id]: { ...existing, refine: { ...existing.refine, ...patch } } },
        },
      };
    });
  }, []);

  const patchQA = useCallback((patch: Partial<QABrief>) => {
    updateState((state) => {
      const id = state.draft.projectId;
      const existing = state.draft.drafts[id] ?? emptyProjectDraft();
      return {
        ...state,
        draft: {
          ...state.draft,
          drafts: { ...state.draft.drafts, [id]: { ...existing, qa: { ...existing.qa, ...patch } } },
        },
      };
    });
  }, []);

  const patchProject = useCallback((id: string, patch: Partial<ProjectProfile>) => {
    updateState((current) => ({
      ...current,
      projects: current.projects.map((entry) =>
        entry.id === id ? { ...entry, ...patch, updatedAt: Date.now() } : entry,
      ),
    }));
  }, []);

  /**
   * The context control and the project's "guidelines installed" state
   * are the same fact, so there is one source of truth: flipping the
   * control marks the project, and the status chip reads it back.
   */
  const setContextMode = useCallback(
    (mode: ContextMode) => {
      if (!project) return;
      patchProject(project.id, { guidelinesInstalled: mode === "guidelines" });
    },
    [patchProject, project],
  );

  /** Switching projects swaps the whole working draft — nothing carries over. */
  const selectProject = useCallback((projectId: string) => {
    updateState((state) => ({
      ...state,
      draft: {
        ...state.draft,
        projectId,
        drafts: state.draft.drafts[projectId]
          ? state.draft.drafts
          : { ...state.draft.drafts, [projectId]: emptyProjectDraft() },
      },
    }));
    setActiveSavedId(null);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!prompt.trim()) return;
    const ok = await copyText(prompt);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } else {
      flash("Copy failed — select the prompt and copy manually");
    }
  }, [prompt, flash]);

  /* Cmd/Ctrl + Enter copies the prompt from anywhere */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void handleCopy();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleCopy]);

  const clearCurrentMode = () => {
    const fresh: Partial<ProjectDraft> =
      draft.mode === "new-screen"
        ? { newScreen: emptyNewScreen() }
        : draft.mode === "reference"
          ? { reference: emptyReference() }
          : draft.mode === "refine"
            ? { refine: emptyRefine() }
            : { qa: emptyQA() };
    patchProjectDraft(fresh);
    setActiveSavedId(null);
    setLastSavedPrompt("");
    flash("New brief");
  };

  /** Never discard work silently: ask first, and only when there is work. */
  const startNew = () => {
    if (briefEmpty) {
      clearCurrentMode();
      return;
    }
    setConfirm({
      title: "Start a new brief?",
      body: activeSavedId
        ? "This clears the brief you are working on. Your saved copy stays in Saved prompts."
        : "This clears the brief you are working on, and it has not been saved. Save it first if you want to keep it.",
      confirmLabel: "Clear and start new",
      onConfirm: clearCurrentMode,
    });
  };

  const resetAll = () => {
    const run = () => {
      updateState((state) => ({
        ...state,
        draft: {
          ...state.draft,
          drafts: { ...state.draft.drafts, [state.draft.projectId]: emptyProjectDraft() },
        },
      }));
      setActiveSavedId(null);
      setLastSavedPrompt("");
      flash(`All briefs cleared for ${project?.name ?? "this project"}`);
    };

    const anyContent = (["new-screen", "reference", "refine", "qa"] as const).some(
      (mode) => !isBriefEmpty(draft, mode),
    );
    if (!anyContent) {
      run();
      return;
    }
    setConfirm({
      title: `Clear every brief in ${project?.name ?? "this project"}?`,
      body: "All four modes are cleared for this project. Other projects and saved prompts are untouched. This cannot be undone.",
      confirmLabel: "Clear all briefs",
      onConfirm: run,
    });
  };

  const save = (asNew = false) => {
    if (briefEmpty) {
      flash("Nothing to save yet — fill in the brief first");
      return;
    }
    if (!asNew && activeSavedId && prompt === lastSavedPrompt) {
      flash("No changes since the last save");
      return;
    }

    const now = Date.now();
    const id = asNew || !activeSavedId ? newId("saved") : activeSavedId;
    const entry: SavedPrompt = {
      id,
      title: deriveTitle(draft, current),
      projectId: project?.id ?? "",
      projectName: project?.name ?? "No project",
      mode: draft.mode,
      createdAt: now,
      updatedAt: now,
      guardrails: draft.guardrails,
      detail: draft.detail,
      contextMode: promptContext.contextMode,
      brief: structuredClone(briefFor(draft)),
      prompt,
    };

    updateState((state) => {
      const existing = state.savedPrompts.find((item) => item.id === entry.id);
      const savedList = existing
        ? state.savedPrompts.map((item) =>
            item.id === entry.id ? { ...entry, title: item.title, createdAt: item.createdAt } : item,
          )
        : [...state.savedPrompts, asNew ? { ...entry, title: `${entry.title} copy` } : entry];
      return { ...state, savedPrompts: savedList };
    });
    setActiveSavedId(entry.id);
    setLastSavedPrompt(prompt);
    flash(asNew ? "Saved as a new prompt" : activeSavedId ? "Saved prompt updated" : "Saved");
  };

  const openSaved = (saved: SavedPrompt) => {
    updateState((state) => {
      const projectId = state.projects.some((entry) => entry.id === saved.projectId)
        ? saved.projectId
        : state.draft.projectId;
      const existing = state.draft.drafts[projectId] ?? emptyProjectDraft();
      const restored: ProjectDraft = { ...existing };
      if (saved.mode === "new-screen") restored.newScreen = saved.brief as NewScreenBrief;
      if (saved.mode === "reference") restored.reference = saved.brief as ReferenceBrief;
      if (saved.mode === "refine") restored.refine = saved.brief as RefineBrief;
      if (saved.mode === "qa") restored.qa = saved.brief as QABrief;

      return {
        ...state,
        draft: {
          ...state.draft,
          mode: saved.mode,
          projectId,
          guardrails: saved.guardrails,
          detail: saved.detail ?? state.draft.detail,
          drafts: { ...state.draft.drafts, [projectId]: restored },
        },
      };
    });
    setActiveSavedId(saved.id);
    setLastSavedPrompt(saved.prompt);
    setDialog(null);
    setView("brief");
  };

  const modeSummary = MODES.find((mode) => mode.id === draft.mode);

  return (
    <div className="fpb-app flex min-h-dvh flex-col bg-fpb-canvas text-fpb-ink lg:h-dvh lg:overflow-hidden">
      <header className="sticky top-0 z-30 shrink-0 border-b border-fpb-line bg-fpb-panel lg:static">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-6">
          <h1 className="text-[13.5px] font-semibold tracking-[-0.01em] text-fpb-ink">Figma Prompt Builder</h1>

          <label className="sr-only" htmlFor="fpb-project">
            Project
          </label>
          <select
            id="fpb-project"
            value={project?.id ?? ""}
            onChange={(event) => selectProject(event.target.value)}
            className="h-8 max-w-[190px] rounded border border-fpb-line-strong bg-fpb-panel px-2 text-[12.5px] text-fpb-ink"
          >
            {projects.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>

          {project ? (
            <button
              type="button"
              onClick={() => setDialog("guidelines")}
              title="View the Guidelines.md generated from this project profile"
              className="inline-flex h-8 items-center gap-1.5 rounded border border-fpb-line-strong bg-fpb-panel px-2 text-[12px] text-fpb-muted transition-colors hover:text-fpb-ink"
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${project.guidelinesInstalled ? "bg-fpb-positive" : "bg-fpb-faint"}`}
              />
              {project.guidelinesInstalled ? "Guidelines active" : "Guidelines not installed"}
              <BookOpen aria-hidden className="h-3.5 w-3.5 text-fpb-faint" />
            </button>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button size="sm" onClick={() => setDialog("projects")}>
              <FolderOpen aria-hidden className="h-3.5 w-3.5" />
              Projects
            </Button>
            <Button size="sm" onClick={() => setDialog("saved")}>
              Saved
              {savedPrompts.length > 0 ? (
                <span className="tabular-nums text-fpb-faint">{savedPrompts.length}</span>
              ) : null}
            </Button>
            <span aria-hidden className="mx-1 hidden h-5 w-px bg-fpb-line sm:block" />
            <Button size="sm" onClick={startNew}>
              <Plus aria-hidden className="h-3.5 w-3.5" />
              New
            </Button>
            <Button size="sm" onClick={() => save()} disabled={briefEmpty} title={briefEmpty ? "Fill in the brief first" : undefined}>
              <Save aria-hidden className="h-3.5 w-3.5" />
              {activeSavedId ? "Update" : "Save"}
            </Button>
            {activeSavedId ? (
              <Button size="sm" onClick={() => save(true)} disabled={briefEmpty}>
                Save as new
              </Button>
            ) : null}
            <Button size="sm" onClick={resetAll}>
              <RotateCcw aria-hidden className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-fpb-line px-4 py-2 md:px-6">
          <Segmented
            label="Prompt mode"
            value={draft.mode}
            options={MODES.map((mode) => ({ id: mode.id as PromptMode, label: mode.label, hint: mode.blurb }))}
            onChange={(mode) => patchDraft({ mode })}
          />
          <p className="hidden text-[12px] text-fpb-faint lg:block">{modeSummary?.blurb}</p>
          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-fpb-muted">
              <input
                type="checkbox"
                checked={draft.guardrails}
                onChange={(event) => patchDraft({ guardrails: event.target.checked })}
                className="h-3.5 w-3.5 accent-[var(--fpb-accent)]"
              />
              <Sparkles aria-hidden className="h-3.5 w-3.5 text-fpb-faint" />
              Anti-AI UI guardrails
            </label>
          </div>
        </div>

        {/* mobile: brief / prompt switch */}
        <div className="flex items-center gap-2 border-t border-fpb-line px-4 py-2 lg:hidden">
          <Segmented
            label="Panel"
            value={view}
            options={[
              { id: "brief", label: "Brief" },
              { id: "prompt", label: "Prompt" },
            ]}
            onChange={setView}
          />
          {view === "brief" ? (
            <div className="ml-auto flex items-center gap-2">
              <ReadinessPill readiness={readiness} />
              <Button variant="primary" size="sm" onClick={handleCopy}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section
          aria-label="Design brief"
          className={`min-h-0 w-full shrink-0 overflow-y-auto border-fpb-line bg-fpb-panel lg:w-[42%] lg:border-r ${
            view === "brief" ? "" : "hidden lg:block"
          }`}
        >
          <div className="flex min-h-[41px] items-center justify-between gap-2 border-b border-fpb-line px-4 py-2 md:px-5">
            <p className="text-[12px] text-fpb-faint">Autosaved to this browser</p>
            {draft.mode === "new-screen" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  patchNewScreen(sampleNewScreenBrief());
                  flash("Sample brief loaded");
                }}
              >
                Load sample brief
              </Button>
            ) : null}
          </div>

          {draft.mode === "new-screen" ? <NewScreenForm brief={current.newScreen} onChange={patchNewScreen} /> : null}
          {draft.mode === "reference" ? <ReferenceForm brief={current.reference} onChange={patchReference} /> : null}
          {draft.mode === "refine" ? <RefineForm brief={current.refine} onChange={patchRefine} /> : null}
          {draft.mode === "qa" ? <QAForm brief={current.qa} onChange={patchQA} /> : null}

        </section>

        <section
          aria-label="Generated prompt"
          className={`min-h-0 flex-1 ${view === "prompt" ? "" : "hidden lg:block"}`}
        >
          <PromptPanel
            prompt={prompt}
            readiness={readiness}
            copied={copied}
            onCopy={handleCopy}
            mode={draft.mode}
            contextMode={promptContext.contextMode}
            detail={draft.detail}
            onContextModeChange={setContextMode}
            onDetailChange={(detail: DetailLevel) => patchDraft({ detail })}
            conflicts={conflicts}
            projectName={project?.name ?? ""}
          />
        </section>
      </main>

      {dialog === "projects" ? (
        <ProjectsModal
          projects={projects}
          activeId={project?.id ?? ""}
          defaultId={state.settings.defaultProjectId}
          onSave={(next) => updateState((current) => ({ ...current, projects: next }))}
          onSelect={selectProject}
          onSetDefault={(id) =>
            updateState((current) => ({ ...current, settings: { ...current.settings, defaultProjectId: id } }))
          }
          onViewGuidelines={(id: string) => {
            selectProject(id);
            setDialog("guidelines");
          }}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === "guidelines" && project ? (
        <GuidelinesModal
          project={project}
          guardrails={draft.guardrails}
          onSetInstalled={(installed) => patchProject(project.id, { guidelinesInstalled: installed })}
          onCopy={copyText}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {dialog === "saved" ? (
        <SavedPromptsModal
          prompts={savedPrompts}
          onOpen={openSaved}
          onChange={(next) => updateState((current) => ({ ...current, savedPrompts: next }))}
          onClose={() => setDialog(null)}
        />
      ) : null}

      {confirm ? (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <div className="px-5 py-4">
            <p className="text-[13px] leading-[1.6] text-fpb-muted">{confirm.body}</p>
          </div>
          <footer className="flex justify-end gap-2 border-t border-fpb-line px-5 py-3">
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                confirm.onConfirm();
                setConfirm(null);
              }}
            >
              {confirm.confirmLabel}
            </Button>
          </footer>
        </Modal>
      ) : null}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
        {toast ? (
          <p className="rounded border border-fpb-line-strong bg-fpb-panel px-3 py-1.5 text-[12.5px] text-fpb-ink shadow-[0_6px_20px_rgba(20,20,25,0.12)]">
            {toast}
          </p>
        ) : null}
      </div>
    </div>
  );
}
