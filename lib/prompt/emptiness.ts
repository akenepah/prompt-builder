/**
 * Is there actually a brief here?
 *
 * Every mode produces a prompt containing standing rules even when
 * nothing has been filled in, so prompt length is no signal at all. Copy
 * and Save must refuse that output rather than present boilerplate as a
 * usable prompt.
 */

import type { Draft, PromptMode } from "./types";
import { projectDraft } from "./prompts";

function has(value: string | undefined | null): boolean {
  return (value ?? "").trim().length > 0;
}

export function isBriefEmpty(draft: Draft, mode: PromptMode = draft.mode): boolean {
  const current = projectDraft(draft);

  switch (mode) {
    case "new-screen": {
      const brief = current.newScreen;
      return !(
        has(brief.screenName) ||
        has(brief.whatWeAreDesigning) ||
        has(brief.primaryGoal) ||
        has(brief.primaryUser) ||
        has(brief.requiredContent) ||
        has(brief.primaryCta) ||
        has(brief.visualDirection) ||
        brief.sections.some((section) => has(section.name) || has(section.purpose) || has(section.content)) ||
        brief.hierarchy.some((item) => has(item.text))
      );
    }
    case "reference": {
      const brief = current.reference;
      return !(
        has(brief.targetScreen) ||
        has(brief.whatWeAreCreating) ||
        has(brief.referenceName) ||
        has(brief.referenceDescription) ||
        has(brief.specificallyBorrow) ||
        has(brief.mustRemainOurs) ||
        has(brief.requiredContent) ||
        has(brief.primaryGoal)
      );
    }
    case "refine": {
      const brief = current.refine;
      return !(
        has(brief.frameName) ||
        has(brief.areaBeingChanged) ||
        has(brief.currentProblem) ||
        has(brief.desiredResult) ||
        has(brief.untouched) ||
        has(brief.notes)
      );
    }
    case "qa": {
      const brief = current.qa;
      return !(has(brief.frameName) || has(brief.knownIssues) || has(brief.unchanged) || has(brief.notes));
    }
  }
}

/** True when the brief carries content the user would not want silently discarded. */
export function hasUnsavedWork(draft: Draft, mode: PromptMode = draft.mode): boolean {
  return !isBriefEmpty(draft, mode);
}
