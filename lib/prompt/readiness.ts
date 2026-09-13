/**
 * Prompt readiness.
 *
 * Deliberately not "percentage of fields filled". A prompt is strong when
 * the information that actually changes the design is present: who the
 * user is and what they are trying to do, what is on the screen, what
 * matters most, and the project's standing rules. Everything else is
 * optional and is never nagged about.
 */

import { hasCriticalConflict, type Conflict } from "./conflicts";
import { projectDraft } from "./prompts";
import type { Draft, ProjectProfile, Readiness } from "./types";

const LABELS: Record<Readiness["level"], string> = {
  "needs-context": "Needs context",
  good: "Good",
  strong: "Strong",
};

interface Signal {
  present: boolean;
  weight: number;
  suggestion: string;
}

function has(value: string | undefined | null): boolean {
  return (value ?? "").trim().length > 0;
}

function projectSignal(project: ProjectProfile | null): Signal {
  const rich =
    !!project &&
    (has(project.productDescription) || has(project.primaryUsers)) &&
    (project.colors.length > 0 || has(project.headingTypeface) || has(project.spacingScale));
  return {
    present: rich,
    weight: 1,
    suggestion: "Fill in the project profile — type, color and spacing rules carry into every prompt.",
  };
}

function evaluate(signals: Signal[]): Readiness {
  const total = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const score = signals.reduce((sum, signal) => sum + (signal.present ? signal.weight : 0), 0);
  const ratio = total === 0 ? 0 : score / total;

  const level: Readiness["level"] = ratio >= 0.85 ? "strong" : ratio >= 0.55 ? "good" : "needs-context";

  return {
    level,
    label: LABELS[level],
    suggestions: signals
      .filter((signal) => !signal.present)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((signal) => signal.suggestion),
  };
}

export function evaluateReadiness(
  draft: Draft,
  project: ProjectProfile | null,
  conflicts: Conflict[] = [],
): Readiness {
  const readiness = scoreReadiness(draft, project);

  /*
   * A brief can be complete and still wrong — written against another
   * project, or asking for something the profile forbids. Reporting that
   * as "Strong" is the misleading state this guard exists to prevent.
   */
  if (hasCriticalConflict(conflicts) && readiness.level === "strong") {
    return { ...readiness, level: "good", label: LABELS.good };
  }
  return readiness;
}

function scoreReadiness(draft: Draft, project: ProjectProfile | null): Readiness {
  const current = projectDraft(draft);
  switch (draft.mode) {
    case "new-screen": {
      const brief = current.newScreen;
      const sectionsFilled = brief.sections.filter((entry) => has(entry.name) && (has(entry.purpose) || has(entry.content)));
      return evaluate([
        {
          present: has(brief.whatWeAreDesigning) || (has(brief.screenName) && has(brief.screenType)),
          weight: 2,
          suggestion: "Say what this screen is — name it and describe what you are designing.",
        },
        {
          present: has(brief.primaryGoal),
          weight: 3,
          suggestion: "Add the primary user goal — the one thing someone must accomplish here.",
        },
        {
          present: sectionsFilled.length >= 2 || has(brief.requiredContent),
          weight: 3,
          suggestion: "Describe the required content or add at least two sections.",
        },
        {
          present: brief.hierarchy.filter((item) => has(item.text)).length >= 2,
          weight: 3,
          suggestion: "Define what users should notice first, second and third.",
        },
        {
          present: has(brief.primaryUser) || (!!project && has(project.primaryUsers)),
          weight: 1,
          suggestion: "Name the primary user for this screen.",
        },
        {
          present: has(brief.primaryCta),
          weight: 1,
          suggestion: "Name the primary action so it can be given real prominence.",
        },
        projectSignal(project),
      ]);
    }

    case "reference": {
      const brief = current.reference;
      return evaluate([
        {
          present: has(brief.targetScreen) || has(brief.whatWeAreCreating),
          weight: 2,
          suggestion: "Say which screen you are designing with this reference.",
        },
        {
          present: has(brief.referenceName) || has(brief.referenceDescription),
          weight: 3,
          suggestion: "Describe the reference — what it is and what works about it.",
        },
        {
          present: brief.borrowAspects.length > 0 || has(brief.specificallyBorrow),
          weight: 3,
          suggestion: "Choose what should be borrowed, so the prompt can translate principles instead of copying.",
        },
        {
          present: has(brief.mustRemainOurs),
          weight: 2,
          suggestion: "State what must stay unmistakably yours.",
        },
        {
          present: has(brief.requiredContent) || has(brief.primaryGoal),
          weight: 2,
          suggestion: "Add the target screen's goal or its required content.",
        },
        projectSignal(project),
      ]);
    }

    case "refine": {
      const brief = current.refine;
      return evaluate([
        {
          present: has(brief.frameName) || has(brief.areaBeingChanged),
          weight: 3,
          suggestion: "Name the frame and the area being changed — scope is what keeps Figma out of the rest of the screen.",
        },
        {
          present: has(brief.currentProblem),
          weight: 3,
          suggestion: "Describe the current problem in concrete terms.",
        },
        {
          present: has(brief.desiredResult),
          weight: 2,
          suggestion: "Describe what the result should be instead.",
        },
        {
          present: has(brief.untouched) || brief.protectExisting,
          weight: 2,
          suggestion: "List what must stay untouched, or turn on Protect existing design.",
        },
        {
          present: brief.categories.length > 0,
          weight: 2,
          suggestion: "Pick the refinement categories so the pass stays narrow.",
        },
        projectSignal(project),
      ]);
    }

    case "qa": {
      const brief = current.qa;
      return evaluate([
        {
          present: has(brief.frameName),
          weight: 2,
          suggestion: "Name the frame being reviewed.",
        },
        {
          present: brief.categories.length >= 3,
          weight: 3,
          suggestion: "Choose at least three things to inspect.",
        },
        {
          present: has(brief.knownIssues),
          weight: 1,
          suggestion: "List any issues you already know about, so they get fixed at the cause.",
        },
        {
          present: has(brief.unchanged),
          weight: 1,
          suggestion: "Note anything that must not change during the pass.",
        },
        projectSignal(project),
      ]);
    }
  }
}
