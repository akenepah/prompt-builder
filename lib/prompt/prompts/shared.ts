/**
 * Shared writing utilities and the reusable blocks that appear across
 * more than one prompt mode.
 *
 * Rules of the house:
 *  - never emit a heading with an empty or meaningless body
 *  - never emit a raw form value where a sentence is clearer
 *  - concrete instructions beat adjectives ("modern", "clean", "premium")
 *  - say each thing once, in the section that owns it
 *
 * Every block takes the detail level so verbosity can flex without any
 * requirement being dropped: detail controls explanation, not content.
 */

import type { ContextMode, Density, DetailLevel, ProjectProfile } from "../types";

export interface PromptSection {
  heading: string;
  body: string;
}

export interface PromptContext {
  project: ProjectProfile | null;
  guardrails: boolean;
  contextMode: ContextMode;
  detail: DetailLevel;
}

/* ------------------------------------------------------------------ */
/* text helpers                                                        */
/* ------------------------------------------------------------------ */

export function clean(value: string | undefined | null): string {
  return (value ?? "").trim();
}

export function filled(value: string | undefined | null): boolean {
  return clean(value).length > 0;
}

/** Join the truthy parts with single newlines. */
export function lines(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0).join("\n");
}

/** Join the truthy parts with a blank line between them. */
export function paragraphs(...parts: Array<string | false | null | undefined>): string {
  return parts.filter((part): part is string => typeof part === "string" && part.trim().length > 0).join("\n\n");
}

export function bullets(items: string[]): string {
  return items
    .map((item) => clean(item))
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");
}

export function numbered(items: string[], start = 1): string {
  return items
    .map((item) => clean(item))
    .filter(Boolean)
    .map((item, index) => `${index + start}. ${item}`)
    .join("\n");
}

/**
 * Split a freeform textarea into discrete items. Users type lists either
 * one-per-line or comma separated; both should produce clean bullets.
 */
export function toItems(value: string | undefined | null): string[] {
  const text = clean(value);
  if (!text) return [];
  const byLine = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]\s+|\d{1,2}[.)]\s+)/, "").trim())
    .filter(Boolean);
  if (byLine.length > 1) return byLine;
  const single = byLine[0] ?? "";
  if (single.includes(",") && single.length < 220 && !/[.;:]/.test(single)) {
    return single
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return byLine;
}

/** "a", "a and b", "a, b and c" */
export function sentenceList(items: string[]): string {
  const list = items.map(clean).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** Lowercase the first letter so a value can be dropped mid-sentence. */
export function lowerFirst(value: string): string {
  const text = clean(value);
  if (!text) return "";
  if (/^[A-Z]{2,}/.test(text)) return text; // keep acronyms
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Ensure a fragment reads as a sentence when it is dropped into prose. */
export function asSentence(value: string): string {
  const text = clean(value);
  if (!text) return "";
  return /[.!?:]$/.test(text) ? text : `${text}.`;
}

export function section(heading: string, body: string): PromptSection | null {
  const text = clean(body);
  if (!text) return null;
  return { heading, body: text };
}

export function renderSections(sections: Array<PromptSection | null>): string {
  return sections
    .filter((entry): entry is PromptSection => Boolean(entry && clean(entry.body)))
    .map((entry) => `${entry.heading}\n${entry.body}`)
    .join("\n\n");
}

/* ------------------------------------------------------------------ */
/* detail level                                                        */
/* ------------------------------------------------------------------ */

const DETAIL_RANK: Record<DetailLevel, number> = { focused: 0, standard: 1, comprehensive: 2 };

/** True when the prompt is at or above the given verbosity. */
export function atLeast(detail: DetailLevel, level: DetailLevel): boolean {
  return DETAIL_RANK[detail] >= DETAIL_RANK[level];
}

/** Explanatory tails: kept at standard and above, dropped when focused. */
export function explain(detail: DetailLevel, text: string): string {
  return atLeast(detail, "standard") ? text : "";
}

/** Extra implementation depth: comprehensive only. */
export function deep(detail: DetailLevel, text: string): string {
  return atLeast(detail, "comprehensive") ? text : "";
}

/* ------------------------------------------------------------------ */
/* project context                                                     */
/* ------------------------------------------------------------------ */

export const GUIDELINES_POINTER =
  "Follow the project's existing Guidelines.md and the selected design system as authoritative. Do not override established project-level typography, color, spacing, component, accessibility or composition rules unless this task explicitly instructs otherwise. Anything stated below is specific to this task and overrides the project defaults only where it says so.";

/**
 * Who the product is for. Kept even in guidelines mode at standard and
 * above: it is short, and it is what stops the output being generic.
 */
export function productContextBody(context: PromptContext): string {
  const { project, contextMode, detail } = context;
  if (!project) return "";

  if (contextMode === "guidelines") {
    return lines(
      GUIDELINES_POINTER,
      atLeast(detail, "standard") && filled(project.productDescription)
        ? `For orientation: ${asSentence(project.productDescription)}`
        : "",
    );
  }

  return lines(
    filled(project.productDescription) && `Product: ${asSentence(project.productDescription)}`,
    filled(project.primaryUsers) && `Who uses it: ${asSentence(project.primaryUsers)}`,
    filled(project.brandDirection) && `Experience direction: ${asSentence(project.brandDirection)}`,
  );
}

/**
 * The project's persistent design rules, written into the prompt itself.
 * Only used in embedded mode — when Guidelines.md is installed this
 * belongs there, not in every task prompt.
 */
export function designSystemBody(context: PromptContext): string {
  const { project, contextMode, detail } = context;
  if (!project || contextMode === "guidelines") return "";

  const type = lines(
    filled(project.headingTypeface) && `Headings: ${project.headingTypeface}`,
    filled(project.bodyTypeface) && `Body and UI: ${project.bodyTypeface}`,
  );

  const colors = project.colors
    .filter((token) => filled(token.name) || filled(token.value))
    .map((token) => {
      const head = [clean(token.name), clean(token.value)].filter(Boolean).join(" ");
      return filled(token.purpose) ? `${head} — ${lowerFirst(token.purpose)}` : head;
    });

  const layout = lines(
    filled(project.grid.columns) && `Columns: ${project.grid.columns}`,
    filled(project.grid.maxWidth) && `Content max width: ${project.grid.maxWidth}`,
    filled(project.grid.gutters) && `Gutters: ${project.grid.gutters}`,
    filled(project.grid.margins) && `Outer margins: ${project.grid.margins}`,
  );

  const surfaces = lines(
    filled(project.radius) && `Radius: ${asSentence(project.radius)}`,
    filled(project.borders) && `Borders: ${asSentence(project.borders)}`,
    filled(project.shadows) && `Elevation: ${asSentence(project.shadows)}`,
    filled(project.icons) && `Icons: ${asSentence(project.icons)}`,
    filled(project.buttons) && `Buttons: ${asSentence(project.buttons)}`,
    filled(project.imagery) && `Imagery: ${asSentence(project.imagery)}`,
  );

  return paragraphs(
    type && `Typography\n${type}`,
    colors.length > 0 && `Color — use these tokens only\n${bullets(colors)}`,
    filled(project.spacingScale) && `Spacing — every margin, padding and gap comes from this scale, no one-off values\n${project.spacingScale}`,
    layout && `Grid\n${layout}`,
    surfaces && `Surfaces and components\n${surfaces}`,
    filled(project.permanentRules) && `Standing rules\n${bullets(toItems(project.permanentRules))}`,
    "Where this brief appears to conflict with these rules, the design system wins.",
    deep(
      detail,
      "Build with real components and Auto Layout so these rules hold when content length changes, rather than styling each instance by hand.",
    ),
  );
}

/* ------------------------------------------------------------------ */
/* universal rules                                                     */
/* ------------------------------------------------------------------ */

/**
 * Inventing product facts and writing interface copy are different acts.
 * Forbidding both produces a screen full of empty labels, so the rule
 * has to draw the line explicitly.
 */
export function contentHonestyBody(): string {
  return paragraphs(
    "Treat the supplied content as the only source of fact. Invent no statistics, metrics, prices, customer counts, testimonials, company or customer names, logos, awards, integrations or claims about what the product can do. Where a figure is needed and has not been supplied, use an obvious placeholder rather than a plausible invention.",
    "Do write the interface copy the screen needs — button and link labels, headings, field labels, helper text, validation messages, empty-state guidance and confirmations — short, specific, in the product's voice, and never asserting a capability or fact that was not supplied. Never use lorem ipsum.",
  );
}

export const EXPANSION_RULE =
  "If more room is needed, expand the relevant parent frame or container. Do not shrink typography, compress the spacing scale, clip content, break component proportions, or force awkward text wrapping to make something fit. Readable typography and the established spacing scale take priority over a fixed frame height.";

export const PRIMARY_ACTION_RULE =
  "Where the workflow has a clear next step, give that action unmistakable dominance. Do not create several equal-weight primary actions unless the task genuinely requires them.";

/**
 * Accessibility baseline. Only written into the prompt in embedded mode;
 * in guidelines mode it lives in Guidelines.md.
 *
 * The touch-target line deliberately separates the visible control size
 * from its interactive area, so it cannot contradict a project that
 * specifies, say, a 36px button.
 */
export function accessibilityBody(context: PromptContext, extra?: string): string {
  const { project, contextMode, detail } = context;
  const projectRules = project ? toItems(project.accessibility) : [];

  if (contextMode === "guidelines") {
    return paragraphs(
      filled(extra) ? asSentence(clean(extra)) : "",
      atLeast(detail, "comprehensive")
        ? "Apply the project's accessibility rules from Guidelines.md to everything added here."
        : "",
    );
  }

  const base = [
    "Body text meets at least 4.5:1 contrast, large text and meaningful icons at least 3:1.",
    "Every interactive element has a visible focus state that does not rely on color alone.",
    "Touch hit areas are at least 44×44px. Where a control's specified visual size is smaller, keep the visual size and extend the hit area with padding — do not enlarge the visible control.",
    "Never use color alone to carry meaning.",
    ...(atLeast(detail, "comprehensive")
      ? ["Headings follow a sensible order and labels sit with their inputs, so the screen reads correctly top to bottom."]
      : []),
  ];
  return paragraphs(bullets([...projectRules, ...base]), filled(extra) ? asSentence(clean(extra)) : "");
}

export function responsiveBody(context: PromptContext, extra?: string): string {
  const { project, contextMode, detail } = context;
  return lines(
    contextMode === "embedded" && project && filled(project.breakpoints)
      ? `Breakpoints: ${asSentence(project.breakpoints)}`
      : "",
    filled(extra) ? clean(extra) : "",
    explain(
      detail,
      "The information hierarchy must survive every breakpoint. Narrow layouts reflow and stack — they do not reorder priorities, hide primary actions behind menus, or shrink type below readable sizes.",
    ),
  );
}

/* ------------------------------------------------------------------ */
/* anti-AI-UI guardrails — one authoritative block, never repeated      */
/* ------------------------------------------------------------------ */

const GUARDRAIL_AVOID = [
  "Cards and containers as default packaging — use spacing and alignment first, and add a container only where it groups things that belong together.",
  "Rounded rectangles, pills and badges used as decoration rather than to show state.",
  "Gradients, glassmorphism, glows and heavy drop shadows.",
  "Generic SaaS-dashboard styling: equal-weight stat tiles, charts with no data behind them, floating widgets with no owner.",
  "Bento grids adopted for their own sake.",
  "Oversized marketing headlines that push real content below the fold.",
  "An icon beside every label, or icons that repeat the word next to them.",
];

const GUARDRAIL_PREFER = [
  "Type scale, weight and contrast to create hierarchy.",
  "Spacing and alignment to create grouping — proximity before boxes.",
  "A single hairline divider where separation is genuinely needed.",
  "Whitespace used unevenly: more around what matters, less inside what belongs together.",
];

/** The guardrail rules as a list, for reuse in Guidelines.md. */
export function guardrailItems(): { avoid: string[]; prefer: string[] } {
  return { avoid: [...GUARDRAIL_AVOID], prefer: [...GUARDRAIL_PREFER] };
}

/**
 * In guidelines mode this returns nothing: the guardrails are part of
 * Guidelines.md, and repeating them in every prompt is exactly the
 * redundancy this mode exists to remove.
 */
export function guardrailsBody(context: PromptContext): string {
  const { project, guardrails, contextMode, detail } = context;
  const projectDoNots = contextMode === "embedded" && project ? toItems(project.doNotRules) : [];

  if (!guardrails) return projectDoNots.length > 0 ? bullets(projectDoNots) : "";
  if (contextMode === "guidelines") return "";

  const avoid = atLeast(detail, "comprehensive") ? GUARDRAIL_AVOID : GUARDRAIL_AVOID.slice(0, 5);
  return paragraphs(
    projectDoNots.length > 0 ? bullets(projectDoNots) : "",
    `This must not read as generic AI-generated UI. Avoid:\n${bullets(avoid)}`,
    deep(detail, `Before adding a container, shadow, badge or icon, try:\n${bullets(GUARDRAIL_PREFER)}`),
  );
}

/* ------------------------------------------------------------------ */
/* density                                                             */
/* ------------------------------------------------------------------ */

const DENSITY_COPY: Record<Exclude<Density, "">, { short: string; full: string }> = {
  spacious: {
    short: "Spacious — upper end of the spacing scale, generous room around primary content.",
    full: "Spacious. Use the upper end of the spacing scale between sections, give primary content generous breathing room, and accept a longer page rather than crowding. Whitespace is doing real work here — do not fill it.",
  },
  balanced: {
    short: "Balanced — generous between sections, tight within them.",
    full: "Balanced. Generous separation between major sections, tight and deliberate grouping within them, so the eye can find the seams of the page without scanning.",
  },
  dense: {
    short: "Dense — lower end of the spacing scale, compact rows over cards, hold body type size.",
    full: "Dense but not cramped. Use the lower end of the spacing scale, favor compact rows and tables over cards, and keep more information above the fold. Density must not come from shrinking type — hold the body size and tighten spacing instead.",
  },
};

export function densityLine(density: Density, detail: DetailLevel): string {
  if (!density) return "";
  const copy = DENSITY_COPY[density];
  return `Density: ${atLeast(detail, "standard") ? copy.full : copy.short}`;
}

/* ------------------------------------------------------------------ */
/* interaction states                                                  */
/* ------------------------------------------------------------------ */

const STATE_COPY: Record<string, string> = {
  Default: "Default — the resting state, legible and unambiguous without hover.",
  Hover: "Hover — a restrained change (background, border or underline). Do not move or resize the element.",
  Focus: "Focus — a clearly visible keyboard focus ring that is never removed.",
  Active: "Active/pressed — an immediate, obvious response to the press.",
  Selected: "Selected — persistent, readable at a glance, and distinct from hover.",
  Disabled: "Disabled — visibly inert but still legible, and never the only explanation for why an action is unavailable.",
  Loading: "Loading — preserve layout dimensions so nothing jumps when content arrives. Skeletons for content areas, in-place feedback for buttons.",
  Empty: "Empty — explain what belongs here and offer the action that fills it. No decorative illustration, no dead end.",
  Error: "Error — say what went wrong and what to do next, next to the thing that failed. Never a bare red border.",
  Success: "Success — confirm what happened and what changed, then get out of the way.",
};

const STATE_SHORT: Record<string, string> = {
  Default: "Default — legible and unambiguous without hover.",
  Hover: "Hover — a restrained change; never moves or resizes the element.",
  Focus: "Focus — a visible keyboard ring, never removed.",
  Active: "Active/pressed — an immediate response to the press.",
  Selected: "Selected — persistent and distinct from hover.",
  Disabled: "Disabled — visibly inert but still legible.",
  Loading: "Loading — hold layout dimensions so nothing jumps; skeletons, not spinners.",
  Empty: "Empty — say what belongs here and offer the action that fills it.",
  Error: "Error — what went wrong and what to do next, beside what failed.",
  Success: "Success — confirm what changed, then get out of the way.",
};

export function statesBody(states: string[], notes: string, detail: DetailLevel): string {
  if (states.length === 0) return filled(notes) ? asSentence(clean(notes)) : "";
  const copy = states.map((state) =>
    atLeast(detail, "comprehensive") ? (STATE_COPY[state] ?? state) : (STATE_SHORT[state] ?? state),
  );
  return paragraphs(
    filled(notes) ? asSentence(clean(notes)) : "",
    `Design these states explicitly:\n${bullets(copy)}`,
  );
}

/* ------------------------------------------------------------------ */
/* execution order and closing review                                  */
/* ------------------------------------------------------------------ */

export function executionOrderBody(detail: DetailLevel): string {
  return lines(
    "Establish the page structure, grid, information hierarchy, section relationships and responsive composition before spending effort on decorative polish. Structure is the hardest thing to correct later. Once the foundation is coherent, apply the visual system and interaction detail.",
    explain(detail, "Produce the finished screen in one pass — this is the order to reason and work in, not a instruction to stop early."),
  );
}

const REVIEW_CORE = [
  "Can someone understand what this screen is for, and what to do next, within about five seconds?",
  "Does the visual weight of each section match the stated hierarchy, rather than everything being equal?",
  "Is every container, card and divider earning its place, or is some of it packaging?",
];

const REVIEW_EXTRA = [
  "Does the responsive behavior preserve the hierarchy rather than flattening it?",
  "Does anything assert a fact that was not supplied, or could anything be removed without hurting comprehension?",
];

const REVIEW_DEEP = [
  "Does every spacing, type and color value come from the system rather than being improvised?",
  "Does each designed state read correctly, including empty and error?",
  "Would a designer looking at this be able to tell what the screen is for without the brief?",
];

export function finalReviewBody(detail: DetailLevel): string {
  const questions = [
    ...REVIEW_CORE,
    ...(atLeast(detail, "standard") ? REVIEW_EXTRA : []),
    ...(atLeast(detail, "comprehensive") ? REVIEW_DEEP : []),
  ];
  return lines(
    "Check your own output before finishing:",
    numbered(questions),
    "",
    "Fix what these expose rather than noting it. Where removing something improves the design, remove it.",
  );
}
