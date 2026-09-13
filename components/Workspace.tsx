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
  emptyQA,
  emptyReference,
  emptyRefine,
  newId,
  sampleNewScreenBrief,
} from "@/lib/prompt/defaults";
import { MODES } from "@/lib/prompt/options";
import { briefFor, compileDraft, contextFor } from "@/lib/prompt/prompts";
import { evaluateReadiness } from "@/lib/prompt/readiness";
import { getServerSnapshot, getSnapshot, subscribe, updateState } from "@/lib/prompt/store";
import type {
  ContextMode,
  DetailLevel,
  Draft,
  NewScreenBrief,
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
import { Button, Segmented, Toggle } from "./ui";

function deriveTitle(draft: Draft): string {
  switch (draft.mode) {
    case "new-screen":
      return draft.newScreen.screenName.trim() || draft.newScreen.screenType.trim() || "Untitled screen";
    case "reference":
      return draft.reference.targetScreen.trim()
        ? `Reference — ${draft.reference.targetScreen.trim()}`
        : "Reference translation";
    case "refine":
      return draft.refine.areaBeingChanged.trim()
        ? `Refine — ${draft.refine.areaBeingChanged.trim()}`
        : draft.refine.frameName.trim() || "Refinement";
    case "qa":
      return draft.qa.frameName.trim() ? `QA — ${draft.qa.frameName.trim()}` : "Design QA";
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

  const promptContext = useMemo(() => contextFor(draft, project), [draft, project]);
  const prompt = useMemo(() => compileDraft(draft, project), [draft, project]);
  const readiness = useMemo(() => evaluateReadiness(draft, project), [draft, project]);

  const patchDraft = useCallback((patch: Partial<Draft>) => {
    updateState((current) => ({ ...current, draft: { ...current.draft, ...patch } }));
  }, []);

  const patchNewScreen = useCallback((patch: Partial<NewScreenBrief>) => {
    updateState((current) => ({
      ...current,
      draft: { ...current.draft, newScreen: { ...current.draft.newScreen, ...patch } },
    }));
  }, []);

  const patchReference = useCallback((patch: Partial<ReferenceBrief>) => {
    updateState((current) => ({
      ...current,
      draft: { ...current.draft, reference: { ...current.draft.reference, ...patch } },
    }));
  }, []);

  const patchRefine = useCallback((patch: Partial<RefineBrief>) => {
    updateState((current) => ({
      ...current,
      draft: { ...current.draft, refine: { ...current.draft.refine, ...patch } },
    }));
  }, []);

  const patchQA = useCallback((patch: Partial<QABrief>) => {
    updateState((current) => ({ ...current, draft: { ...current.draft, qa: { ...current.draft.qa, ...patch } } }));
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

  const startNew = () => {
    const fresh: Partial<Draft> =
      draft.mode === "new-screen"
        ? { newScreen: emptyNewScreen() }
        : draft.mode === "reference"
          ? { reference: emptyReference() }
          : draft.mode === "refine"
            ? { refine: emptyRefine() }
            : { qa: emptyQA() };
    patchDraft(fresh);
    setActiveSavedId(null);
    flash("New brief");
  };

  const resetAll = () => {
    updateState((current) => ({
      ...current,
      draft: {
        ...current.draft,
        newScreen: emptyNewScreen(),
        reference: emptyReference(),
        refine: emptyRefine(),
        qa: emptyQA(),
      },
    }));
    setActiveSavedId(null);
    flash("All briefs cleared");
  };

  const save = () => {
    const now = Date.now();
    const entry: SavedPrompt = {
      id: activeSavedId ?? newId("saved"),
      title: deriveTitle(draft),
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
    updateState((current) => {
      const existing = current.savedPrompts.find((item) => item.id === entry.id);
      const savedList = existing
        ? current.savedPrompts.map((item) =>
            item.id === entry.id ? { ...entry, title: item.title, createdAt: item.createdAt } : item,
          )
        : [...current.savedPrompts, entry];
      return { ...current, savedPrompts: savedList };
    });
    setActiveSavedId(entry.id);
    flash(activeSavedId ? "Saved prompt updated" : "Saved");
  };

  const openSaved = (saved: SavedPrompt) => {
    updateState((current) => {
      const next: Draft = {
        ...current.draft,
        mode: saved.mode,
        guardrails: saved.guardrails,
        detail: saved.detail ?? current.draft.detail,
        projectId: current.projects.some((entry) => entry.id === saved.projectId)
          ? saved.projectId
          : current.draft.projectId,
      };
      if (saved.mode === "new-screen") next.newScreen = saved.brief as NewScreenBrief;
      if (saved.mode === "reference") next.reference = saved.brief as ReferenceBrief;
      if (saved.mode === "refine") next.refine = saved.brief as RefineBrief;
      if (saved.mode === "qa") next.qa = saved.brief as QABrief;
      return { ...current, draft: next };
    });
    setActiveSavedId(saved.id);
    setDialog(null);
    setView("brief");
  };

  const modeSummary = MODES.find((mode) => mode.id === draft.mode);

  return (
    <div className="fpb-app flex min-h-dvh flex-col bg-fpb-canvas text-fpb-ink">
      <header className="sticky top-0 z-30 border-b border-fpb-line bg-fpb-panel">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 md:px-6">
          <h1 className="text-[13.5px] font-semibold tracking-[-0.01em] text-fpb-ink">Figma Prompt Builder</h1>

          <label className="sr-only" htmlFor="fpb-project">
            Project
          </label>
          <select
            id="fpb-project"
            value={project?.id ?? ""}
            onChange={(event) => patchDraft({ projectId: event.target.value })}
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
            <Button size="sm" onClick={save}>
              <Save aria-hidden className="h-3.5 w-3.5" />
              Save
            </Button>
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

      <main className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-97px)] lg:flex-row">
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

          {draft.mode === "new-screen" ? <NewScreenForm brief={draft.newScreen} onChange={patchNewScreen} /> : null}
          {draft.mode === "reference" ? <ReferenceForm brief={draft.reference} onChange={patchReference} /> : null}
          {draft.mode === "refine" ? <RefineForm brief={draft.refine} onChange={patchRefine} /> : null}
          {draft.mode === "qa" ? <QAForm brief={draft.qa} onChange={patchQA} /> : null}

          <div className="px-4 py-5 md:px-5">
            <Toggle
              label="Anti-AI UI guardrails"
              hint="Writes the anti-pattern rules into every prompt: no default cards, no gradients, no invented content, typography and spacing before containers."
              checked={draft.guardrails}
              onChange={(guardrails) => patchDraft({ guardrails })}
            />
          </div>
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
          />
        </section>
      </main>

      {dialog === "projects" ? (
        <ProjectsModal
          projects={projects}
          activeId={project?.id ?? ""}
          defaultId={state.settings.defaultProjectId}
          onSave={(next) => updateState((current) => ({ ...current, projects: next }))}
          onSelect={(id) => patchDraft({ projectId: id })}
          onSetDefault={(id) =>
            updateState((current) => ({ ...current, settings: { ...current.settings, defaultProjectId: id } }))
          }
          onViewGuidelines={(id: string) => {
            patchDraft({ projectId: id });
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
