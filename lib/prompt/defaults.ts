/**
 * Empty briefs, the sample project profile and the sample brief that
 * ships with a first run, so the tool explains itself on open.
 *
 * The sample product is fictional but fully specified — it exists to
 * demonstrate what a well-filled project profile does to prompt quality.
 */

import type {
  Draft,
  ProjectDraft,
  NewScreenBrief,
  ProjectProfile,
  QABrief,
  ReferenceBrief,
  RefineBrief,
  SectionSpec,
} from "./types";

export function newId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptySection(): SectionSpec {
  return { id: newId("sec"), name: "", purpose: "", content: "", primaryAction: "", notes: "" };
}

export function emptyProject(name = "Untitled project"): ProjectProfile {
  const now = Date.now();
  return {
    id: newId("proj"),
    name,
    productDescription: "",
    primaryUsers: "",
    brandDirection: "",
    headingTypeface: "",
    bodyTypeface: "",
    colors: [{ id: newId("col"), name: "", value: "", purpose: "" }],
    spacingScale: "4 / 8 / 16 / 24 / 32 / 48 / 64 / 96",
    grid: { columns: "12", maxWidth: "1200px", gutters: "24px", margins: "32px" },
    radius: "",
    borders: "",
    shadows: "",
    icons: "",
    buttons: "",
    imagery: "",
    breakpoints: "Desktop 1200+, tablet 768–1199, mobile below 768",
    accessibility: "",
    permanentRules: "",
    doNotRules: "",
    guidelinesInstalled: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** A copy of a project, with a fresh identity. */
export function duplicateProject(base: ProjectProfile): ProjectProfile {
  const now = Date.now();
  return { ...base, id: newId("proj"), name: `${base.name} copy`, createdAt: now, updatedAt: now };
}

export function emptyNewScreen(): NewScreenBrief {
  return {
    screenName: "",
    screenType: "",
    whatWeAreDesigning: "",
    primaryUser: "",
    primaryGoal: "",
    secondaryGoals: "",
    userConcerns: "",
    trustFactors: "",
    sections: [emptySection()],
    requiredContent: "",
    primaryCta: "",
    secondaryCta: "",
    hierarchy: [{ id: newId("h"), text: "" }],
    visualDirection: "",
    layoutNotes: "",
    referenceNotes: "",
    density: "balanced",
    interactionNotes: "",
    states: ["Default", "Hover", "Focus"],
    responsivePriorities: "",
    responsiveNotes: "",
    screenRules: "",
    mustNotHappen: "",
    mustPreserve: "",
  };
}

export function emptyReference(): ReferenceBrief {
  return {
    targetScreen: "",
    whatWeAreCreating: "",
    referenceName: "",
    referenceDescription: "",
    borrowAspects: [],
    specificallyBorrow: "",
    doNotBorrow: "",
    mustRemainOurs: "",
    requiredContent: "",
    primaryGoal: "",
    hierarchy: [{ id: newId("h"), text: "" }],
    constraints: "",
  };
}

export function emptyRefine(): RefineBrief {
  return {
    frameName: "",
    areaBeingChanged: "",
    currentProblem: "",
    desiredResult: "",
    untouched: "",
    mayChange: "",
    categories: [],
    protectExisting: true,
    expandContainers: true,
    notes: "",
  };
}

export function emptyQA(): QABrief {
  return {
    frameName: "",
    categories: ["Spacing", "Alignment", "Typography", "Hierarchy", "Auto Layout", "Overflow"],
    knownIssues: "",
    unchanged: "",
    notes: "",
    depth: "standard",
    expandContainers: true,
  };
}

export function emptyProjectDraft(): ProjectDraft {
  return {
    newScreen: emptyNewScreen(),
    reference: emptyReference(),
    refine: emptyRefine(),
    qa: emptyQA(),
  };
}

export function emptyDraft(projectId: string): Draft {
  return {
    mode: "new-screen",
    projectId,
    guardrails: true,
    detail: "standard",
    drafts: { [projectId]: emptyProjectDraft() },
  };
}

/* ------------------------------------------------------------------ */
/* sample data                                                         */
/* ------------------------------------------------------------------ */

export const SAMPLE_PROJECT_ID = "proj_ledgerline";

export function sampleProject(): ProjectProfile {
  const now = Date.now();
  return {
    id: SAMPLE_PROJECT_ID,
    name: "Ledgerline",
    productDescription:
      "Ledgerline is a 13-week cash forecasting tool for finance teams at 20–200 person companies. It reads the bank, payroll and invoicing systems a team already uses and projects runway forward, so a controller can answer “are we fine?” without rebuilding a spreadsheet every Monday.",
    primaryUsers:
      "Controllers and finance leads at small companies. Fluent in spreadsheets, skeptical of any automation they cannot audit, and usually working under month-end time pressure.",
    brandDirection:
      "Quiet, precise, auditable. Reads like a well-set financial document rather than a consumer app. Confidence comes from accuracy and legibility, never from visual flourish.",
    headingTypeface: "Söhne, 600 weight. Scale: 32 / 24 / 20 / 16.",
    bodyTypeface:
      "Söhne 400/500 — body 15px/24, small 13px/20. Every figure is set in Söhne Mono with tabular figures so columns line up.",
    colors: [
      { id: "c1", name: "ink", value: "#14161A", purpose: "primary text and all figures" },
      { id: "c2", name: "ink-muted", value: "#5B6169", purpose: "labels, units, secondary text" },
      { id: "c3", name: "canvas", value: "#FFFFFF", purpose: "page background" },
      { id: "c4", name: "surface", value: "#F6F7F8", purpose: "table headers and inert panels" },
      { id: "c5", name: "line", value: "#E3E5E8", purpose: "hairline rules and table borders" },
      { id: "c6", name: "accent", value: "#1F4FD8", purpose: "links, focus, the one primary action per screen" },
      { id: "c7", name: "positive", value: "#16704F", purpose: "cash in and favorable variance" },
      { id: "c8", name: "negative", value: "#A3231F", purpose: "cash out, shortfalls, destructive confirmation" },
    ],
    spacingScale: "4 / 8 / 16 / 24 / 32 / 48 / 64 / 96",
    grid: { columns: "12", maxWidth: "1240px", gutters: "24px", margins: "32px desktop, 24px tablet, 16px mobile" },
    radius: "4px on controls and inputs, 8px on panels, nothing larger. No pill shapes anywhere.",
    borders:
      "1px hairlines in line color. Borders separate data; they never decorate. Never a border and a shadow on the same element.",
    shadows:
      "One elevation only, for things that genuinely float above the page — menus, dialogs, date pickers: 0 8px 24px rgba(20,22,26,0.12). Nothing on the page surface is elevated.",
    icons:
      "Lucide, 1.5px stroke, 16px inline with text and 20px standalone, ink-muted unless interactive. Only where the icon carries meaning — never decorating a heading, never repeating the word beside it.",
    buttons:
      "One primary action per screen: filled accent, 36px high, 12/16 padding. Everything else is a secondary button (1px line on canvas) or a plain text link. Destructive actions are text-first and always name the object being affected.",
    imagery: "No photography, no illustration, no empty-state artwork. The tables and charts are the imagery.",
    breakpoints: "Desktop 1240+, tablet 768–1239, mobile below 768.",
    accessibility:
      "WCAG 2.2 AA. Positive and negative figures never rely on red and green alone — always paired with a sign and a label. Table headers keep context on scroll. The forecast grid is fully keyboard operable.",
    permanentRules:
      "Every figure states its currency and its period.\nFigures are tabular and right-aligned so columns compare at a glance.\nAnything projected rather than actual is visibly marked as projected, everywhere it appears.\nUse a table whenever more than three values are being compared — not cards.\nWherever live data is shown, the last-synced time is visible.",
    doNotRules:
      "No row of dashboard tiles showing a bare number with no comparison.\nNo gradients, glows or glassmorphism.\nNo decorative charts — every chart answers a question that has been stated.\nNo icon-only buttons in primary flows.\nNever invent figures, company names or logos.",
    guidelinesInstalled: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function sampleNewScreenBrief(): NewScreenBrief {
  return {
    screenName: "13-Week Cash Forecast",
    screenType: "Dashboard",
    whatWeAreDesigning:
      "The screen a controller opens first thing on Monday to see whether the next 13 weeks are safe, and if not, which week breaks and what is driving it.",
    primaryUser:
      "A controller at a 60-person company, mid-morning on a Monday, ten minutes before a leadership stand-up.",
    primaryGoal:
      "decide whether the next 13 weeks are safe, and if not, find the first week that breaks and what is causing it",
    secondaryGoals:
      "Check which data sources have synced since Friday\nAdjust a single assumption and see the effect immediately\nExport the forecast for the board pack",
    userConcerns:
      "Is this current, or am I looking at Friday's numbers?\nWhich of these figures are actual and which are projected?\nIf a number looks wrong, where do I go to check it?\nDid my change to the assumption actually take effect?",
    trustFactors:
      "that every figure can be traced back to a source, and that the line between actual and projected is never ambiguous",
    sections: [
      {
        id: "s1",
        name: "Runway answer",
        purpose: "Answer “are we fine?” before the user reads anything else",
        content: "Weeks of runway, closing cash at week 13, and the first week the balance falls below the safety threshold if there is one",
        primaryAction: "",
        notes: "One line of plain language at the top of the page. Not three stat tiles.",
      },
      {
        id: "s2",
        name: "Forecast grid",
        purpose: "The working surface — the 13-week table itself",
        content: "Weeks as columns; opening balance, inflows by category, outflows by category, net movement and closing balance as rows",
        primaryAction: "Edit an assumption inline",
        notes: "Actual weeks and projected weeks must be immediately distinguishable. Header row and first column stay fixed while scrolling.",
      },
      {
        id: "s3",
        name: "What changed",
        purpose: "Explain what is driving the movement so the user knows where to act",
        content: "The five largest variances against last week's forecast, each with its source and direction",
        primaryAction: "Open the driver",
        notes: "",
      },
      {
        id: "s4",
        name: "Data freshness",
        purpose: "Remove any doubt about whether the numbers are current",
        content: "Each connected source with its last sync time, and any sync failures",
        primaryAction: "Re-sync a source",
        notes: "Quiet unless something has failed; loud when it has.",
      },
    ],
    requiredContent:
      "Weeks of runway\n13-week closing cash position\nThe first week below the safety threshold, if any\nThe forecast grid\nTop five variance drivers since last week\nConnected sources with last-sync times",
    primaryCta: "Adjust assumptions",
    secondaryCta: "Export forecast",
    hierarchy: [
      { id: "h1", text: "Whether the company is safe for the next 13 weeks, and the first week that breaks" },
      { id: "h2", text: "The forecast grid, and specifically the week where the balance turns" },
      { id: "h3", text: "What has changed since last week and what is driving it" },
      { id: "h4", text: "Whether the underlying data is current" },
      { id: "h5", text: "Export and the secondary tools" },
    ],
    visualDirection:
      "Reads like a well-set financial document: quiet, dense, tabular, undecorated. The only color on the screen carries meaning.",
    layoutNotes:
      "Full-width working area — the grid needs the horizontal space. The runway answer sits above the grid as a single line of type, not as tiles. Drivers sit below the grid rather than beside it, so the grid keeps its full width.",
    referenceNotes: "",
    density: "dense",
    interactionNotes:
      "Assumption cells are editable in place and recalculate the whole grid immediately, with the recalculated cells briefly marked. Editing should never feel like it needs a save button.",
    states: ["Default", "Hover", "Focus", "Loading", "Empty", "Error"],
    responsivePriorities:
      "The runway answer and the first breaking week must survive to mobile intact. The grid may scroll horizontally with a fixed first column, but must never be hidden or collapsed into cards.",
    responsiveNotes: "",
    screenRules:
      "Every currency figure shows its currency and its period.\nProjected values are marked as projected everywhere they appear, not just in a legend.",
    mustNotHappen:
      "Do not open the screen with a row of stat tiles.\nDo not make a line chart the primary object — the table is the product.\nDo not hide the actual/projected distinction behind a legend.",
    mustPreserve: "",
  };
}

/**
 * First-run state. The worked example is attached to the sample project
 * only — a project the user creates always starts empty, so example
 * content can never appear in real work by accident.
 */
export function sampleDraft(): Draft {
  return {
    mode: "new-screen",
    projectId: SAMPLE_PROJECT_ID,
    guardrails: true,
    detail: "standard",
    drafts: {
      [SAMPLE_PROJECT_ID]: { ...emptyProjectDraft(), newScreen: sampleNewScreenBrief() },
    },
  };
}
