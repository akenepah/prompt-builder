import { describe, expect, test } from "vitest";
import { compileGuidelines } from "../guidelines";
import {
  emptyNewScreen,
  emptyProject,
  emptyProjectDraft,
  emptyQA,
  emptyReference,
  emptyRefine,
  sampleDraft,
  sampleNewScreenBrief,
  sampleProject,
} from "../defaults";
import { detectConflicts, hasCriticalConflict } from "../conflicts";
import { isBriefEmpty } from "../emptiness";
import { evaluateReadiness } from "../readiness";
import { reviveState } from "../storage";
import type { ContextMode, DetailLevel, Draft, NewScreenBrief, ProjectProfile } from "../types";
import {
  briefFor,
  compileDesignQA,
  compileDraft,
  compileNewScreen,
  compileReferenceTranslation,
  compileRefineExisting,
  contextFor,
  type PromptContext,
} from ".";
import { toItems } from "./shared";

const project = sampleProject();

function ctx(overrides: Partial<PromptContext> = {}): PromptContext {
  return { project, guardrails: true, contextMode: "embedded", detail: "standard", ...overrides };
}

function words(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** How many times a phrase appears — the dedupe tests measure this. */
function occurrences(text: string, phrase: string): number {
  return text.toLowerCase().split(phrase.toLowerCase()).length - 1;
}

/**
 * The Ledgerline sample is deliberately maximal — eight color tokens,
 * ten standing rules, four sections, five hierarchy levels. The word
 * targets in the brief describe an ordinary substantial screen, so the
 * length assertions use this more typical pair.
 */
function typicalProject(): ProjectProfile {
  return {
    ...emptyProject("Northwind"),
    productDescription: "A scheduling tool for independent clinics.",
    primaryUsers: "Front-desk staff booking and rescheduling appointments.",
    brandDirection: "Calm, plain and fast. Nothing decorative.",
    headingTypeface: "Inter 600 — 28/22/18",
    bodyTypeface: "Inter 400/500 — 15/24",
    colors: [
      { id: "1", name: "ink", value: "#111827", purpose: "text" },
      { id: "2", name: "accent", value: "#2563EB", purpose: "primary action and links" },
      { id: "3", name: "line", value: "#E5E7EB", purpose: "borders" },
    ],
    radius: "6px on controls, 10px on panels.",
    buttons: "One filled primary per view; everything else outlined or a text link.",
    accessibility: "WCAG 2.1 AA.",
    permanentRules: "Always show the clinic timezone with a time.",
    doNotRules: "No modal confirmations for reversible actions.",
  };
}

function typicalBrief() {
  return {
    ...emptyNewScreen(),
    screenName: "Today's schedule",
    screenType: "Dashboard",
    whatWeAreDesigning: "The screen front-desk staff keep open all day.",
    primaryUser: "A front-desk coordinator at a two-doctor clinic.",
    primaryGoal: "see what is happening now and handle the next arrival without hunting",
    userConcerns: "Who is late?\nWhich room is free?",
    sections: [
      { id: "a", name: "Now", purpose: "Show what is happening this hour", content: "Current appointments and room", primaryAction: "Check in", notes: "" },
      { id: "b", name: "Up next", purpose: "Prepare for arrivals", content: "Next three appointments", primaryAction: "", notes: "" },
      { id: "c", name: "Exceptions", purpose: "Surface what needs a decision", content: "Late arrivals and cancellations", primaryAction: "Reschedule", notes: "" },
    ],
    requiredContent: "Appointment times\nPatient name\nRoom",
    primaryCta: "Check in",
    hierarchy: [
      { id: "1", text: "What is happening right now" },
      { id: "2", text: "What needs a decision" },
      { id: "3", text: "What is coming up" },
    ],
    visualDirection: "Plain and dense, like a well-set timetable.",
    density: "dense" as const,
    states: ["Default", "Hover", "Focus", "Empty"],
    responsivePriorities: "The now view must survive to tablet.",
    mustNotHappen: "Do not bury exceptions below the fold.",
  };
}

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
});

describe("new screen", () => {
  const prompt = compileNewScreen(sampleNewScreenBrief(), ctx());

  test("opens with a role, not a field dump", () => {
    expect(prompt.startsWith("ROLE AND TASK")).toBe(true);
    expect(prompt).toContain("senior product designer");
  });

  test("states an explicit, ordered information hierarchy", () => {
    expect(prompt).toContain("INFORMATION HIERARCHY");
    expect(prompt).toContain("1. Whether the company is safe for the next 13 weeks");
  });

  test("carries the project design system when rules are embedded", () => {
    expect(prompt).toContain("DESIGN SYSTEM — NON-NEGOTIABLE");
    expect(prompt).toContain("#1F4FD8");
    expect(prompt).toContain("4 / 8 / 16 / 24 / 32 / 48 / 64 / 96");
  });

  test("expands density and states into instructions rather than labels", () => {
    expect(prompt).toContain("Dense but not cramped");
    expect(prompt).toContain("hold layout dimensions so nothing jumps");
  });

  test("orders execution: structure before polish", () => {
    expect(prompt).toContain("EXECUTION ORDER");
    expect(prompt).toContain("before spending effort on decorative polish");
    expect(prompt).toContain("Structure is the hardest thing to correct later");
  });

  test("does not tell Figma to stop after the structural stage", () => {
    expect(prompt).toContain("Produce the finished screen in one pass");
  });

  test("closes with a self-review", () => {
    expect(prompt).toContain("BEFORE YOU FINISH");
    expect(prompt).toContain("within about five seconds");
  });

  test("omits sections the user left empty", () => {
    const bare = compileNewScreen({ ...emptyNewScreen(), screenName: "Test" }, ctx({ project: null, guardrails: false }));
    expect(bare).not.toContain("PROJECT CONTEXT");
    expect(bare).not.toContain("INFORMATION HIERARCHY");
    expect(bare).not.toContain("SCREEN STRUCTURE");
    expect(bare).toContain("ROLE AND TASK");
  });

  test("never emits a heading with an empty body", () => {
    for (const text of [compileNewScreen(emptyNewScreen(), ctx()), prompt]) {
      expect(text).not.toMatch(/\n[A-Z][A-Z ]+\n\n/);
      expect(text.endsWith("\n")).toBe(false);
    }
  });
});

describe("redundancy", () => {
  const prompt = compileNewScreen(sampleNewScreenBrief(), ctx());

  test("the primary goal is stated once, not restated in three sections", () => {
    expect(occurrences(prompt, "find the first week that breaks")).toBe(1);
  });

  test("the top hierarchy item is not repeated under the objective", () => {
    expect(occurrences(prompt, "Whether the company is safe for the next 13 weeks")).toBe(1);
  });

  test("anti-AI rules appear under one authoritative heading", () => {
    expect(occurrences(prompt, "must not read as generic AI-generated UI")).toBe(1);
    expect(occurrences(prompt, "Lorem ipsum")).toBeLessThanOrEqual(1);
  });

  test("a typical embedded standard prompt lands in the intended range", () => {
    const typical = compileNewScreen(typicalBrief(), ctx({ project: typicalProject() }));
    expect(words(typical)).toBeGreaterThan(1000);
    expect(words(typical)).toBeLessThan(1800);
  });

  test("installing guidelines takes a typical prompt well below that", () => {
    const project = typicalProject();
    const embedded = compileNewScreen(typicalBrief(), ctx({ project }));
    const guided = compileNewScreen(typicalBrief(), ctx({ project, contextMode: "guidelines" }));
    expect(words(guided)).toBeLessThan(words(embedded) * 0.85);
  });
});

describe("project context modes", () => {
  const brief = sampleNewScreenBrief();
  const embedded = compileNewScreen(brief, ctx({ contextMode: "embedded" }));
  const guidelines = compileNewScreen(brief, ctx({ contextMode: "guidelines" }));

  test("guidelines mode keeps the product name properly cased", () => {
    expect(guidelines).toContain("For orientation: Ledgerline is");
    expect(guidelines).not.toContain("ledgerline is");
  });

  test("guidelines mode points at Guidelines.md as authoritative", () => {
    expect(guidelines).toContain("Guidelines.md");
    expect(guidelines).toContain("Do not override established project-level typography");
  });

  test("guidelines mode stops repeating the design system", () => {
    expect(guidelines).not.toContain("DESIGN SYSTEM — NON-NEGOTIABLE");
    expect(guidelines).not.toContain("#1F4FD8");
    expect(guidelines).not.toContain("4 / 8 / 16 / 24 / 32 / 48 / 64 / 96");
    expect(guidelines).not.toContain("Söhne");
  });

  test("guidelines mode is materially shorter, and what it drops is project-level", () => {
    expect(words(guidelines)).toBeLessThan(words(embedded) * 0.75);
    expect(words(embedded) - words(guidelines)).toBeGreaterThan(500);
  });

  test("guidelines mode keeps everything specific to this screen", () => {
    for (const required of [
      "13-Week Cash Forecast",
      "find the first week that breaks",
      "Forecast grid",
      "INFORMATION HIERARCHY",
      "Adjust assumptions",
      "Assumption cells are editable in place",
      "must survive to mobile intact",
      "Do not open the screen with a row of stat tiles",
      "SCREEN OBJECTIVE",
    ]) {
      expect(guidelines).toContain(required);
    }
  });

  test("embedded mode still carries the whole system", () => {
    expect(embedded).toContain("DESIGN SYSTEM — NON-NEGOTIABLE");
    expect(embedded).toContain("No gradients, glows or glassmorphism");
  });
});

describe("detail levels", () => {
  const brief = sampleNewScreenBrief();
  const build = (detail: DetailLevel, contextMode: ContextMode = "embedded") =>
    compileNewScreen(brief, ctx({ detail, contextMode }));

  test("verbosity increases with the level", () => {
    expect(words(build("focused"))).toBeLessThan(words(build("standard")));
    expect(words(build("standard"))).toBeLessThan(words(build("comprehensive")));
  });

  test("focused keeps objective, structure, hierarchy, behavior and constraints", () => {
    const focused = build("focused");
    for (const heading of [
      "SCREEN OBJECTIVE",
      "SCREEN STRUCTURE",
      "INFORMATION HIERARCHY",
      "INTERACTION AND STATES",
      "DO NOT",
      "EXECUTION ORDER",
    ]) {
      expect(focused).toContain(heading);
    }
  });

  test("focused drops explanation, not requirements", () => {
    const focused = build("focused");
    expect(focused).toContain("Adjust assumptions");
    expect(focused).toContain("Do not open the screen with a row of stat tiles");
    expect(focused).not.toContain("Anything not on this list is supporting material");
  });

  test("comprehensive adds implementation depth", () => {
    expect(build("comprehensive")).toContain("Set resizing behavior (hug, fill, fixed) deliberately");
  });
});

describe("content invention", () => {
  const prompt = compileNewScreen(sampleNewScreenBrief(), ctx());

  test("forbids invented product facts", () => {
    expect(prompt).toContain("Invent no statistics, metrics, prices, customer counts");
    expect(prompt).toContain("Never use lorem ipsum");
  });

  test("explicitly permits necessary interface copy", () => {
    expect(prompt).toContain("Do write the interface copy the screen needs");
    expect(prompt).toContain("validation messages");
  });

  test("does not contradict itself by banning all written copy", () => {
    expect(prompt).not.toContain("Use only the content provided.");
  });
});

describe("universal rules", () => {
  test("the single-primary-action rule is conditional, not absolute", () => {
    const prompt = compileNewScreen(sampleNewScreenBrief(), ctx());
    expect(prompt).toContain("Where the workflow has a clear next step");
    expect(prompt).not.toContain("One primary action per screen.");
  });

  test("touch targets separate hit area from visible control size", () => {
    const prompt = compileNewScreen(sampleNewScreenBrief(), ctx());
    expect(prompt).toContain("keep the visual size and extend the hit area with padding");
    expect(prompt).not.toContain("Interactive targets are at least 44×44px on touch");
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

  test("answers the four delta questions", () => {
    const prompt = compileRefineExisting(brief, ctx());
    expect(prompt).toContain("WHAT IS WRONG");
    expect(prompt).toContain("WHAT SHOULD CHANGE");
    expect(prompt).toContain("WHAT MUST STAY THE SAME");
    expect(prompt).toContain("IF SOMETHING DOES NOT FIT");
  });

  test("protects the rest of the screen in strong language", () => {
    const prompt = compileRefineExisting(brief, ctx());
    expect(prompt).toContain("Refine the selected area only.");
    expect(prompt).toContain("Do not redesign the page.");
    expect(prompt).toContain("Do not modify neighboring approved sections.");
  });

  test("does not dump the project profile when guidelines are installed", () => {
    const prompt = compileRefineExisting(brief, ctx({ contextMode: "guidelines" }));
    expect(prompt).not.toContain("DESIGN SYSTEM — STILL BINDING");
    expect(prompt).not.toContain("Söhne");
    expect(prompt).toContain("Guidelines.md remains authoritative");
    expect(words(prompt)).toBeLessThan(600);
  });

  test("drops the preservation block when protection is off", () => {
    const prompt = compileRefineExisting({ ...brief, protectExisting: false }, ctx());
    expect(prompt).not.toContain("Do not modify neighboring approved sections.");
  });

  test("expands containers rather than compressing the design", () => {
    expect(compileRefineExisting(brief, ctx())).toContain("expand the relevant parent frame or container");
    expect(compileRefineExisting({ ...brief, expandContainers: false }, ctx())).not.toContain(
      "expand the relevant parent frame or container",
    );
  });
});

describe("design QA", () => {
  const brief = { ...emptyQA(), frameName: "Forecast — Desktop", knownIssues: "The panel clips its last row" };

  test("asks for inspection before correction, and reports", () => {
    const prompt = compileDesignQA(brief, ctx());
    expect(prompt).toContain("Work in two passes");
    expect(prompt).toContain("INSPECT");
    expect(prompt).toContain("REPORT");
  });

  test("expands each check into what a reviewer would look for", () => {
    expect(compileDesignQA(brief, ctx())).toContain("padding inside containers is symmetrical");
  });

  test("uses Guidelines.md as the quality bar instead of restating rules", () => {
    const prompt = compileDesignQA(brief, ctx({ contextMode: "guidelines" }));
    expect(prompt).toContain("QUALITY BAR");
    expect(prompt).toContain("Measure everything against the project's Guidelines.md");
    expect(prompt).not.toContain("Söhne");
    expect(words(prompt)).toBeLessThan(words(compileDesignQA(brief, ctx())));
  });

  test("depth changes the latitude given", () => {
    expect(compileDesignQA({ ...brief, depth: "conservative" }, ctx())).toContain("Conservative pass");
    expect(compileDesignQA({ ...brief, depth: "thorough" }, ctx())).toContain("still not a redesign");
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

  test("separates reference principles from target product rules", () => {
    const prompt = compileReferenceTranslation(brief, ctx());
    expect(prompt).toContain("REFERENCE PRINCIPLES — HOW TO APPLY THEM");
    expect(prompt).toContain("TARGET PRODUCT RULES — WHAT STAYS OURS");
    expect(prompt.indexOf("REFERENCE ANALYSIS")).toBeLessThan(prompt.indexOf("TARGET PRODUCT RULES"));
  });

  test("states the thesis of the mode in its own words", () => {
    expect(compileReferenceTranslation(brief, ctx())).toContain("This is a translation, not a reproduction");
  });

  test("says our system wins any conflict", () => {
    expect(compileReferenceTranslation(brief, ctx())).toContain("our system wins without discussion");
  });

  test("names Guidelines.md as the winner when it is installed", () => {
    const prompt = compileReferenceTranslation(brief, ctx({ contextMode: "guidelines" }));
    expect(prompt).toContain("Guidelines.md wins without discussion");
    expect(prompt).not.toContain("DESIGN SYSTEM — NON-NEGOTIABLE");
  });

  test("always excludes the reference's type, color and content", () => {
    const prompt = compileReferenceTranslation({ ...brief, doNotBorrow: "" }, ctx());
    expect(prompt).toContain("The reference's typefaces, type sizes and color values.");
    expect(prompt).toContain("no copied headlines, labels, figures or feature names");
  });
});

describe("guidelines document", () => {
  const doc = compileGuidelines(project, true);

  test("is a markdown document with the expected spine", () => {
    expect(doc.startsWith("# Ledgerline — Design Guidelines")).toBe(true);
    for (const heading of [
      "## Project overview",
      "## Experience principles",
      "## Design system",
      "### Typography",
      "### Color",
      "### Spacing",
      "### Grid and layout",
      "### Radius",
      "### Borders",
      "### Elevation",
      "### Icons",
      "### Buttons and actions",
      "### Imagery and illustration",
      "## Responsive behavior",
      "## Accessibility",
      "## Composition principles",
      "## Permanent rules",
      "## Do not",
      "## AI UI guardrails",
    ]) {
      expect(doc).toContain(heading);
    }
  });

  test("carries the standing rules that task prompts stop repeating", () => {
    expect(doc).toContain("#1F4FD8");
    expect(doc).toContain("4 / 8 / 16 / 24 / 32 / 48 / 64 / 96");
    expect(doc).toContain("Söhne");
    expect(doc).toContain("Every figure states its currency and its period.");
    expect(doc).toContain("No gradients, glows or glassmorphism.");
    expect(doc).toContain("must not read as generic AI-generated UI");
  });

  test("holds no task-specific content", () => {
    for (const leak of ["13-Week Cash Forecast", "Adjust assumptions", "Forecast grid", "runway answer"]) {
      expect(doc).not.toContain(leak);
    }
  });

  test("is written as instruction, not as a field dump", () => {
    expect(doc).toContain("Treat this document as the authoritative design system");
    expect(doc).toContain("Where a task appears to conflict with it, this document wins.");
  });

  test("guardrails can be switched off", () => {
    expect(compileGuidelines(project, false)).not.toContain("## AI UI guardrails");
  });

  test("degrades to something useful for a barely-filled project", () => {
    const bare: ProjectProfile = { ...emptyProject("Bare"), productDescription: "A tiny tool." };
    const doc = compileGuidelines(bare, true);
    expect(doc).toContain("# Bare — Design Guidelines");
    expect(doc).not.toContain("### Radius");
    expect(doc).toContain("## Accessibility");
  });
});

describe("guidelines + prompt together", () => {
  test("the pair covers what the embedded prompt covers", () => {
    const brief = sampleNewScreenBrief();
    const embedded = compileNewScreen(brief, ctx({ contextMode: "embedded" }));
    const pair = `${compileGuidelines(project, true)}\n${compileNewScreen(brief, ctx({ contextMode: "guidelines" }))}`;

    for (const fact of [
      "#1F4FD8",
      "4 / 8 / 16 / 24 / 32 / 48 / 64 / 96",
      "Söhne",
      "1240px",
      "Every figure states its currency and its period.",
      "No gradients, glows or glassmorphism.",
      "13-Week Cash Forecast",
      "Adjust assumptions",
    ]) {
      expect(embedded.includes(fact) || fact === "13-Week Cash Forecast").toBe(true);
      expect(pair).toContain(fact);
    }
  });
});

describe("readiness", () => {
  const blankDraft = (mode: Draft["mode"]): Draft => ({
    mode,
    projectId: "p",
    guardrails: true,
    detail: "standard",
    drafts: { p: emptyProjectDraft() },
  });

  test("the sample brief with its project is strong", () => {
    expect(evaluateReadiness(sampleDraft(), project).level).toBe("strong");
  });

  test("an empty brief needs context and says what is missing", () => {
    const readiness = evaluateReadiness(blankDraft("new-screen"), null);
    expect(readiness.level).toBe("needs-context");
    expect(readiness.suggestions.length).toBeLessThanOrEqual(3);
    expect(readiness.suggestions.join(" ")).toContain("primary user goal");
  });

  test("readiness is not a field count — hierarchy and goal dominate", () => {
    const padded = blankDraft("new-screen");
    const brief = padded.drafts.p.newScreen;
    brief.visualDirection = "quiet";
    brief.layoutNotes = "full width";
    brief.interactionNotes = "inline edit";
    brief.screenRules = "no tiles";
    expect(evaluateReadiness(padded, null).level).toBe("needs-context");
  });
});

describe("storage", () => {
  test("garbage in storage falls back to a usable state", () => {
    const state = reviveState({ projects: "nope", savedPrompts: 3 });
    expect(state.projects.length).toBeGreaterThan(0);
    expect(state.savedPrompts).toEqual([]);
    expect(state.draft.mode).toBe("new-screen");
  });

  test("a v1.0 payload gains the later fields instead of undefined", () => {
    const state = reviveState({
      draft: { mode: "qa", projectId: "p1", guardrails: true },
      projects: [{ id: "p1", name: "Old", colors: [], grid: { columns: "12" } }],
    });
    expect(state.draft.detail).toBe("standard");
    expect(state.projects[0].guidelinesInstalled).toBe(false);
    expect(state.projects[0].name).toBe("Old");
    expect(state.projects[0].grid.maxWidth).toBeTruthy();
  });

  test("a flat pre-isolation draft is migrated onto the project it was written for", () => {
    const state = reviveState({
      draft: {
        mode: "new-screen",
        projectId: "p1",
        newScreen: { ...emptyNewScreen(), screenName: "Old work" },
      },
      projects: [{ id: "p1", name: "Old", colors: [], grid: {} }],
    });
    expect(state.draft.drafts.p1.newScreen.screenName).toBe("Old work");
    expect(Object.keys(state.draft.drafts)).toEqual(["p1"]);
  });
});

describe("dispatch", () => {
  test("each mode compiles through the shared entry point", () => {
    const draft = sampleDraft();
    for (const mode of ["new-screen", "reference", "refine", "qa"] as const) {
      expect(compileDraft({ ...draft, mode }, project).length).toBeGreaterThan(80);
    }
  });

  test("context mode follows the project's installed flag", () => {
    const draft = sampleDraft();
    expect(contextFor(draft, project).contextMode).toBe("embedded");
    expect(contextFor(draft, { ...project, guidelinesInstalled: true }).contextMode).toBe("guidelines");
  });
});


describe("project isolation", () => {
  const ledgerline = sampleProject();
  const zoo: ProjectProfile = {
    ...emptyProject("Woodland Park Zoo"),
    productDescription: "A zoo website for planning a family visit.",
    primaryUsers: "Parents planning a weekend outing.",
    headingTypeface: "Recoleta 600",
    colors: [{ id: "z1", name: "moss", value: "#2F5D3A", purpose: "primary" }],
    imagery: "Large wildlife photography, full bleed.",
  };

  function twoProjectDraft(active: string): Draft {
    return {
      mode: "new-screen",
      projectId: active,
      guardrails: true,
      detail: "standard",
      drafts: {
        [ledgerline.id]: { ...emptyProjectDraft(), newScreen: sampleNewScreenBrief() },
        [zoo.id]: {
          ...emptyProjectDraft(),
          newScreen: { ...emptyNewScreen(), screenName: "WPZ-01 Homepage", primaryGoal: "plan a visit" },
        },
      },
    };
  }

  test("each project reads its own brief", () => {
    const draft = twoProjectDraft(zoo.id);
    expect((briefFor(draft) as NewScreenBrief).screenName).toBe("WPZ-01 Homepage");
    expect((briefFor({ ...draft, projectId: ledgerline.id }) as NewScreenBrief).screenName).toBe("13-Week Cash Forecast");
  });

  test("a project with no draft yet starts empty, not with someone else's work", () => {
    const draft: Draft = { ...twoProjectDraft(ledgerline.id), projectId: "brand-new" };
    expect(isBriefEmpty(draft)).toBe(true);
    expect((briefFor(draft) as NewScreenBrief).screenName).toBe("");
  });

  test("the generated prompt carries no trace of the other project", () => {
    const prompt = compileDraft(twoProjectDraft(zoo.id), zoo);
    for (const leak of [
      "Ledgerline",
      "13-Week Cash Forecast",
      "Söhne",
      "#1F4FD8",
      "cash",
      "forecast",
      "runway",
      "controller",
      "tabular",
    ]) {
      expect(prompt.toLowerCase()).not.toContain(leak.toLowerCase());
    }
    expect(prompt).toContain("WPZ-01 Homepage");
  });

  test("switching back restores the original project's brief intact", () => {
    const draft = twoProjectDraft(zoo.id);
    const back = { ...draft, projectId: ledgerline.id };
    const prompt = compileDraft(back, ledgerline);
    expect(prompt).toContain("13-Week Cash Forecast");
    expect(prompt).not.toContain("WPZ-01 Homepage");
  });

  test("the worked example is attached to the sample project only", () => {
    const state = reviveState(undefined);
    expect(Object.keys(state.draft.drafts)).toEqual([sampleProject().id]);
  });
});

describe("conflict detection", () => {
  const ledgerline = sampleProject();
  const zoo: ProjectProfile = { ...emptyProject("Woodland Park Zoo"), imagery: "No photography anywhere." };

  function draftWith(brief: Partial<NewScreenBrief>, projectId: string): Draft {
    return {
      mode: "new-screen",
      projectId,
      guardrails: true,
      detail: "standard",
      drafts: { [projectId]: { ...emptyProjectDraft(), newScreen: { ...emptyNewScreen(), ...brief } } },
    };
  }

  test("flags a brief written for a different project in the workspace", () => {
    const draft = draftWith(
      { screenName: "Woodland Park Zoo homepage", whatWeAreDesigning: "The Woodland Park Zoo landing page." },
      ledgerline.id,
    );
    const conflicts = detectConflicts(draft, ledgerline, [ledgerline, zoo]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].title).toContain("Woodland Park Zoo");
    expect(conflicts[0].severity).toBe("critical");
  });

  test("does not flag a brief that names its own project", () => {
    const draft = draftWith({ whatWeAreDesigning: "A Ledgerline screen for Ledgerline users." }, ledgerline.id);
    expect(detectConflicts(draft, ledgerline, [ledgerline, zoo])).toHaveLength(0);
  });

  test("flags a brief asking for something the profile forbids", () => {
    const draft = draftWith({ visualDirection: "Use large wildlife photography across the hero." }, zoo.id);
    const conflicts = detectConflicts(draft, zoo, [zoo]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].title).toContain("photography");
    expect(conflicts[0].detail).toContain("No photography anywhere.");
  });

  test("does not flag a brief that agrees with the rule", () => {
    const draft = draftWith({ visualDirection: "No photography — illustration only." }, zoo.id);
    expect(detectConflicts(draft, zoo, [zoo])).toHaveLength(0);
  });

  test("catches the project's own do-not rules too", () => {
    const draft = draftWith({ layoutNotes: "Open with a row of stat tiles." }, ledgerline.id);
    const conflicts = detectConflicts(draft, ledgerline, [ledgerline]);
    expect(conflicts.some((conflict) => conflict.id === "rule-tiles")).toBe(true);
  });

  test("an affirmative mention still counts when an earlier mention was negated", () => {
    const draft = draftWith(
      {
        layoutNotes: "A single line of type, not as tiles.",
        visualDirection: "Big gradients and stat tiles across the top.",
      },
      ledgerline.id,
    );
    const ids = detectConflicts(draft, ledgerline, [ledgerline]).map((conflict) => conflict.id);
    expect(ids).toContain("rule-tiles");
    expect(ids).toContain("rule-gradient");
  });

  test("a rule the brief also rules out is not a conflict, however it is phrased", () => {
    for (const phrasing of [
      "Do not open the screen with a row of stat tiles.",
      "One line of plain language. Not three stat tiles.",
      "A single line of type, not as tiles.",
      "Use a table instead of stat tiles.",
    ]) {
      const draft = draftWith({ layoutNotes: phrasing }, ledgerline.id);
      expect(detectConflicts(draft, ledgerline, [ledgerline]).map((c) => c.id)).not.toContain("rule-tiles");
    }
  });

  test("the shipped sample brief has no conflicts with its own project", () => {
    const draft: Draft = {
      mode: "new-screen",
      projectId: ledgerline.id,
      guardrails: true,
      detail: "standard",
      drafts: { [ledgerline.id]: { ...emptyProjectDraft(), newScreen: sampleNewScreenBrief() } },
    };
    expect(detectConflicts(draft, ledgerline, [ledgerline])).toHaveLength(0);
  });

  test("an empty brief conflicts with nothing", () => {
    expect(detectConflicts(draftWith({}, ledgerline.id), ledgerline, [ledgerline, zoo])).toHaveLength(0);
  });

  test("a critical conflict prevents a Strong readiness rating", () => {
    const draft: Draft = {
      mode: "new-screen",
      projectId: ledgerline.id,
      guardrails: true,
      detail: "standard",
      drafts: { [ledgerline.id]: { ...emptyProjectDraft(), newScreen: sampleNewScreenBrief() } },
    };
    expect(evaluateReadiness(draft, ledgerline).level).toBe("strong");

    const conflicts = detectConflicts(draft, ledgerline, [ledgerline, zoo]);
    const conflicted = evaluateReadiness(draft, ledgerline, [
      { id: "x", severity: "critical", title: "t", detail: "d" },
    ]);
    expect(conflicted.level).toBe("good");
    expect(hasCriticalConflict(conflicts)).toBe(false);
  });
});

describe("empty briefs", () => {
  function draftFor(mode: Draft["mode"]): Draft {
    return { mode, projectId: "p", guardrails: true, detail: "standard", drafts: { p: emptyProjectDraft() } };
  }

  test("an untouched brief is empty in every mode", () => {
    for (const mode of ["new-screen", "reference", "refine", "qa"] as const) {
      expect(isBriefEmpty(draftFor(mode))).toBe(true);
    }
  });

  test("one meaningful field is enough to stop being empty", () => {
    const draft = draftFor("new-screen");
    draft.drafts.p.newScreen.primaryGoal = "book a ticket";
    expect(isBriefEmpty(draft)).toBe(false);
  });

  test("whitespace is not content", () => {
    const draft = draftFor("qa");
    draft.drafts.p.qa.frameName = "   ";
    expect(isBriefEmpty(draft)).toBe(true);
  });

  test("selected QA categories alone do not make a usable brief", () => {
    const draft = draftFor("qa");
    expect(draft.drafts.p.qa.categories.length).toBeGreaterThan(0);
    expect(isBriefEmpty(draft)).toBe(true);
  });
});

describe("focused mode compression", () => {
  test("focused is 40-60% below standard for a typical brief", () => {
    const project = typicalProject();
    const standard = words(compileNewScreen(typicalBrief(), ctx({ project })));
    const focused = words(compileNewScreen(typicalBrief(), ctx({ project, detail: "focused" })));
    const cut = 1 - focused / standard;
    expect(cut).toBeGreaterThanOrEqual(0.4);
    expect(cut).toBeLessThanOrEqual(0.6);
  });

  test("focused still carries objective, hierarchy, structure and constraints", () => {
    const focused = compileNewScreen(sampleNewScreenBrief(), ctx({ detail: "focused" }));
    for (const required of [
      "SCREEN OBJECTIVE",
      "SCREEN STRUCTURE",
      "INFORMATION HIERARCHY",
      "Forecast grid",
      "Adjust assumptions",
      "Do not open the screen with a row of stat tiles",
      "4 / 8 / 16 / 24 / 32 / 48 / 64 / 96",
    ]) {
      expect(focused).toContain(required);
    }
  });

  test("focused keeps preservation rules in refine mode", () => {
    const brief = {
      ...emptyRefine(),
      frameName: "Home",
      areaBeingChanged: "the header",
      currentProblem: "misaligned",
    };
    const focused = compileRefineExisting(brief, ctx({ detail: "focused" }));
    expect(focused).toContain("Refine the selected area only.");
    expect(focused).toContain("Do not redesign the page.");
  });
});

describe("interaction states", () => {
  test("only the selected states reach the prompt, and all of them do", () => {
    const brief = { ...sampleNewScreenBrief(), states: ["Focus", "Empty", "Success"] };
    const prompt = compileNewScreen(brief, ctx());
    expect(prompt).toContain("Focus —");
    expect(prompt).toContain("Empty —");
    expect(prompt).toContain("Success —");
    expect(prompt).not.toContain("Disabled —");
    expect(prompt).not.toContain("Hover —");
  });

  test("every option in the picker has prompt copy behind it", () => {
    const all = ["Default", "Hover", "Focus", "Active", "Selected", "Disabled", "Loading", "Empty", "Error", "Success"];
    const prompt = compileNewScreen({ ...sampleNewScreenBrief(), states: all }, ctx());
    for (const state of all) expect(prompt).toMatch(new RegExp(`${state}(/\\w+)? —`));
  });
});

describe("language", () => {
  test("no reference is assumed when none was supplied", () => {
    const prompt = compileNewScreen({ ...sampleNewScreenBrief(), referenceNotes: "" }, ctx());
    expect(prompt).not.toMatch(/\bthe (supplied |attached |provided )?(reference|screenshot|mockup)\b/i);
  });

  test("grammar slips stay fixed", () => {
    const prompt = compileNewScreen(sampleNewScreenBrief(), ctx());
    expect(prompt).not.toContain("not a instruction");
    expect(prompt).toContain("not an instruction");
  });
});
