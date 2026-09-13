/**
 * Prompt compiler entry point.
 *
 * Every mode is a pure function of (brief, context), where context
 * carries the project, the guardrail switch, whether Guidelines.md is
 * installed, and how verbose the output should be. Keeping the signature
 * uniform is what makes an optional LLM polish stage a later drop-in.
 */

import { emptyProjectDraft } from "../defaults";
import type {
  Draft,
  NewScreenBrief,
  ProjectDraft,
  ProjectProfile,
  PromptMode,
  QABrief,
  ReferenceBrief,
  RefineBrief,
  SavedPrompt,
} from "../types";
import { compileDesignQA } from "./designQA";
import { compileNewScreen } from "./newScreen";
import { compileReferenceTranslation } from "./referenceTranslation";
import { compileRefineExisting } from "./refineExisting";
import type { PromptContext } from "./shared";

export type { PromptContext };

/** Reserved extension point for a future LLM polish stage. */
export type PromptEnhancer = (prompt: string, context: PromptContext & { mode: PromptMode }) => Promise<string>;

/** A project with Guidelines.md installed does not need its rules repeated. */
export function contextFor(draft: Draft, project: ProjectProfile | null): PromptContext {
  return {
    project,
    guardrails: draft.guardrails,
    contextMode: project?.guidelinesInstalled ? "guidelines" : "embedded",
    detail: draft.detail,
  };
}

export function compileDraft(draft: Draft, project: ProjectProfile | null): string {
  return compileBrief(draft.mode, briefFor(draft), contextFor(draft, project));
}

/** The active project's briefs. Never falls back to another project's work. */
export function projectDraft(draft: Draft, projectId = draft.projectId): ProjectDraft {
  return draft.drafts[projectId] ?? emptyProjectDraft();
}

export function briefFor(draft: Draft, mode: PromptMode = draft.mode): SavedPrompt["brief"] {
  const current = projectDraft(draft);
  switch (mode) {
    case "new-screen":
      return current.newScreen;
    case "reference":
      return current.reference;
    case "refine":
      return current.refine;
    case "qa":
      return current.qa;
  }
}

export function compileBrief(mode: PromptMode, brief: SavedPrompt["brief"], context: PromptContext): string {
  switch (mode) {
    case "new-screen":
      return compileNewScreen(brief as NewScreenBrief, context);
    case "reference":
      return compileReferenceTranslation(brief as ReferenceBrief, context);
    case "refine":
      return compileRefineExisting(brief as RefineBrief, context);
    case "qa":
      return compileDesignQA(brief as QABrief, context);
  }
}

export { compileDesignQA, compileNewScreen, compileReferenceTranslation, compileRefineExisting };
