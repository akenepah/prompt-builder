/**
 * Prompt compiler entry point.
 *
 * Every mode is a pure function of (brief, project, guardrails). Keeping
 * the signature uniform is what makes an optional LLM polish stage a
 * later drop-in: an enhancer takes the compiled deterministic prompt and
 * returns a better one, without any caller needing to change.
 */

import type {
  Draft,
  NewScreenBrief,
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

export interface CompileOptions {
  project: ProjectProfile | null;
  guardrails: boolean;
}

/** Reserved extension point for a future LLM polish stage. */
export type PromptEnhancer = (prompt: string, context: CompileOptions & { mode: PromptMode }) => Promise<string>;

export function compileDraft(draft: Draft, project: ProjectProfile | null): string {
  return compileBrief(draft.mode, briefFor(draft), { project, guardrails: draft.guardrails });
}

export function briefFor(draft: Draft): SavedPrompt["brief"] {
  switch (draft.mode) {
    case "new-screen":
      return draft.newScreen;
    case "reference":
      return draft.reference;
    case "refine":
      return draft.refine;
    case "qa":
      return draft.qa;
  }
}

export function compileBrief(
  mode: PromptMode,
  brief: SavedPrompt["brief"],
  options: CompileOptions,
): string {
  switch (mode) {
    case "new-screen":
      return compileNewScreen(brief as NewScreenBrief, options.project, options.guardrails);
    case "reference":
      return compileReferenceTranslation(brief as ReferenceBrief, options.project, options.guardrails);
    case "refine":
      return compileRefineExisting(brief as RefineBrief, options.project, options.guardrails);
    case "qa":
      return compileDesignQA(brief as QABrief, options.project);
  }
}

export { compileDesignQA, compileNewScreen, compileReferenceTranslation, compileRefineExisting };
