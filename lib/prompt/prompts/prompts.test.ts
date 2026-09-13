import { describe, expect, test } from "vitest";
import {
  emptyNewScreen,
  emptyQA,
  emptyReference,
  emptyRefine,
  sampleDraft,
  sampleNewScreenBrief,
  sampleProject,
} from "../defaults";
import { evaluateReadiness } from "../readiness";
import { reviveState } from "../storage";
import type { Draft } from "../types";
import { compileDesignQA, compileDraft, compileNewScreen, compileReferenceTranslation, compileRefineExisting } from ".";
import { toItems } from "./shared";

const project = sampleProject();

describe("shared helpers", () => {
  test("splits a textarea into items without eating leading numbers", () => {
    expect(toItems("13-week closing cash\nWeeks of runway")).toEqual(["13-week closing cash", "Weeks of runway"]);
  });

  test("strips list markers the user typed", () => {
    expect(toItems("- one\n2. two\n* three")).toEqual(["one", "two", "three"]);
  });

  test("falls back to comma splitting for a single short line", () => {
    expect(toItems("spacing, alignment, type")).toEqual(["spacing", "alignment", "type"]);
  });

  test("treats an empty value as no items", () => {
    expect(toItems("   ")).toEqual([]);
  });
});

describe("new screen", () => {
  const prompt = compileNewScreen(sampleNewScreenBrief(), project, true);

  test("opens with a role, not a field dump", () => {
    expect(prompt.startsWith("ROLE AND TASK")).toBe(true);
    expect(prompt).toContain("senior product designer and UX architect");
  });

  test("states an explicit, ordered information hierarchy", () => {
    expect(prompt).toContain("INFORMATION HIERARCHY");
    expect(prompt).toContain("1. Whether the company is safe for the next 13 weeks");
    expect(prompt).toContain("Do not give every section equal visual weight");
  });

  test("carries the project design system in as non-negotiable", () => {
    expect(prompt).toContain("DESIGN SYSTEM — NON-NEGOTIABLE");
    expect(prompt).toContain("#1F4FD8");
    expect(prompt).toContain("4 / 8 / 16 / 24 / 32 / 48 / 64 / 96");
    expect(prompt).toContain("the design system wins");
  });

  test("expands density and states into instructions rather than labels", () => {
    expect(prompt).toContain("Dense but not cramped");
    expect(prompt).toContain("Skeletons over spinners");
  });

  test("forbids invented content and container packaging", () => {
    expect(prompt).toContain("never use lorem ipsum");
    expect(prompt).toContain("Cards and containers used as default packaging");
  });

  test("always closes with a self-review", () => {
    expect(prompt).toContain("FINAL DESIGN REVIEW");
    expect(prompt).toContain("within about five seconds");
  });

  test("omits sections the user left empty", () => {
    const bare = compileNewScreen({ ...emptyNewScreen(), screenName: "Test" }, null, false);
    expect(bare).not.toContain("PRODUCT CONTEXT");
    expect(bare).not.toContain("INFORMATION HIERARCHY");
    expect(bare).not.toContain("SCREEN STRUCTURE");
    expect(bare).toContain("ROLE AND TASK");
  });

  test("guardrails are what add the anti-pattern block", () => {
    const brief = sampleNewScreenBrief();
    expect(compileNewScreen(brief, project, false)).not.toContain("must not read as generic AI-generated UI");
    expect(compileNewScreen(brief, project, true)).toContain("must not read as generic AI-generated UI");
  });

  test("keeps the project's own do-not rules even with guardrails off", () => {
    expect(compileNewScreen(sampleNewScreenBrief(), project, false)).toContain("No gradients, glows or glassmorphism");
  });

  test("never emits a heading with an empty body", () => {
    const prompts = [
      compileNewScreen(emptyNewScreen(), null, true),
      compileNewScreen(sampleNewScreenBrief(), project, true),
    ];
    for (const text of prompts) {
      expect(text).not.toMatch(/\n[A-Z][A-Z ]+\n\n/);
      expect(text.endsWith("\n")).toBe(false);
    }
  });
});

describe("refine existing", () => {
  const brief = {
    ...emptyRefine(),
    frameName: "Forecast — Desktop",
    areaBeingChanged: "the drivers panel",
    currentProblem: "the cards are different heights",
    desiredResult: "a ranked, aligned list",
    untouched: "The forecast grid",
    categories: ["Alignment", "Spacing"],
  };

  test("protects the rest of the screen in strong language", () => {
    const prompt = compileRefineExisting(brief, project, true);
    expect(prompt).toContain("Refine the selected area only.");
    expect(prompt).toContain("Do not redesign the page.");
    expect(prompt).toContain("Do not modify neighboring approved sections.");
    expect(prompt).toContain("precision refinement pass, not a redesign");
  });

  test("drops the preservation block when protection is turned off", () => {
    const prompt = compileRefineExisting({ ...brief, protectExisting: false }, project, true);
    expect(prompt).not.toContain("Do not modify neighboring approved sections.");
    expect(prompt).toContain("THE PROBLEM");
  });

  test("expands containers rather than compressing the design", () => {
    const prompt = compileRefineExisting(brief, project, true);
    expect(prompt).toContain("expand the relevant parent frame or container");
    expect(prompt).toContain("Do not shrink typography");
    expect(compileRefineExisting({ ...brief, expandContainers: false }, project, true)).not.toContain(
      "expand the relevant parent frame or container",
    );
  });

  test("turns each selected category into a concrete instruction", () => {
    const prompt = compileRefineExisting(brief, project, true);
    expect(prompt).toContain("align edges and baselines to the grid");
    expect(prompt).toContain("back onto the spacing scale");
    expect(prompt).not.toContain("Auto Layout — convert absolutely-positioned");
  });

  test("scopes everything else out explicitly", () => {
    expect(compileRefineExisting(brief, project, true)).toContain("Anything not listed here is out of scope");
  });
});

describe("reference translation", () => {
  const brief = {
    ...emptyReference(),
    targetScreen: "Forecast overview",
    referenceName: "A data-heavy console",
    referenceDescription: "Tight rows, one accent color",
    borrowAspects: ["Content density", "Spacing"],
    mustRemainOurs: "Our tabular figures",
  };
  const prompt = compileReferenceTranslation(brief, project, true);

  test("separates reference principles from target product rules", () => {
    expect(prompt).toContain("REFERENCE PRINCIPLES — HOW TO APPLY THEM");
    expect(prompt).toContain("TARGET PRODUCT RULES — WHAT STAYS OURS");
    expect(prompt.indexOf("REFERENCE ANALYSIS")).toBeLessThan(prompt.indexOf("TARGET PRODUCT RULES"));
  });

  test("says the project's system wins any conflict", () => {
    expect(prompt).toContain("our system wins without discussion");
  });

  test("instructs analysis, not copying", () => {
    expect(prompt).toContain("This is a translation, not a reproduction");
    expect(prompt).toContain("analyze the reference structurally");
    expect(prompt).toContain("apply the principle — not the appearance");
  });

  test("always excludes type, color and content even when nothing was listed", () => {
    const bare = compileReferenceTranslation({ ...brief, doNotBorrow: "" }, project, true);
    expect(bare).toContain("The reference's typefaces, type sizes and color values.");
    expect(bare).toContain("no copied headlines, labels, figures or feature names");
  });
});

describe("design QA", () => {
  const brief = { ...emptyQA(), frameName: "Forecast — Desktop", knownIssues: "The panel clips its last row" };
  const prompt = compileDesignQA(brief, project);

  test("asks for inspection before correction", () => {
    expect(prompt).toContain("Work in two passes");
    expect(prompt).toContain("INSPECT");
    expect(prompt).toContain("REPORT");
  });

  test("expands each check into what a reviewer would actually look for", () => {
    expect(prompt).toContain("padding inside containers is symmetrical");
    expect(prompt).toContain("hug/fill/fixed");
  });

  test("preserves the existing design language", () => {
    expect(prompt).toContain("This is a correction pass, not a redesign");
    expect(prompt).toContain("Preserve the content");
  });

  test("depth changes the latitude given", () => {
    expect(compileDesignQA({ ...brief, depth: "conservative" }, project)).toContain("Conservative pass");
    expect(compileDesignQA({ ...brief, depth: "thorough" }, project)).toContain("still not a redesign");
  });

  test("works with no project profile at all", () => {
    const bare = compileDesignQA(brief, null);
    expect(bare).toContain("INSPECT");
    expect(bare).not.toContain("MEASURE AGAINST THIS SYSTEM");
  });
});

describe("readiness", () => {
  const blankDraft = (mode: Draft["mode"]): Draft => ({
    mode,
    projectId: "",
    guardrails: true,
    newScreen: emptyNewScreen(),
    reference: emptyReference(),
    refine: emptyRefine(),
    qa: emptyQA(),
  });

  test("the sample brief with its project is strong", () => {
    expect(evaluateReadiness(sampleDraft(), project).level).toBe("strong");
  });

  test("an empty brief needs context and says what is missing", () => {
    const readiness = evaluateReadiness(blankDraft("new-screen"), null);
    expect(readiness.level).toBe("needs-context");
    expect(readiness.suggestions.length).toBeGreaterThan(0);
    expect(readiness.suggestions.length).toBeLessThanOrEqual(3);
    expect(readiness.suggestions.join(" ")).toContain("primary user goal");
  });

  test("readiness is not just a field count — hierarchy and goal dominate", () => {
    const padded = blankDraft("new-screen");
    padded.newScreen.visualDirection = "quiet";
    padded.newScreen.layoutNotes = "full width";
    padded.newScreen.interactionNotes = "inline edit";
    padded.newScreen.screenRules = "no tiles";
    expect(evaluateReadiness(padded, null).level).toBe("needs-context");
  });

  test("never nags with more than three suggestions in any mode", () => {
    for (const mode of ["new-screen", "reference", "refine", "qa"] as const) {
      expect(evaluateReadiness(blankDraft(mode), null).suggestions.length).toBeLessThanOrEqual(3);
    }
  });
});

describe("storage", () => {
  test("garbage in storage falls back to a usable state", () => {
    const state = reviveState({ projects: "nope", savedPrompts: 3 });
    expect(state.projects.length).toBeGreaterThan(0);
    expect(state.savedPrompts).toEqual([]);
    expect(state.draft.mode).toBe("new-screen");
  });

  test("a draft from an older shape is filled in rather than trusted", () => {
    const state = reviveState({ draft: { mode: "qa" } });
    expect(state.draft.mode).toBe("qa");
    expect(state.draft.newScreen.sections.length).toBeGreaterThan(0);
  });
});

describe("dispatch", () => {
  test("each mode compiles through the shared entry point", () => {
    const draft = sampleDraft();
    for (const mode of ["new-screen", "reference", "refine", "qa"] as const) {
      expect(compileDraft({ ...draft, mode }, project).length).toBeGreaterThan(80);
    }
  });
});
