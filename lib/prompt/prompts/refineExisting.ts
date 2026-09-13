/**
 * REFINE EXISTING — a precision pass on part of an approved screen.
 *
 * Deliberately the shortest of the four modes. A refinement only needs
 * to answer four questions: what is wrong, what should change, how, and
 * what must stay the same. When Guidelines.md is installed the project's
 * design system is not repeated here at all.
 */

import type { RefineBrief } from "../types";
import {
  EXPANSION_RULE,
  asSentence,
  atLeast,
  bullets,
  clean,
  designSystemBody,
  explain,
  filled,
  guardrailsBody,
  lines,
  lowerFirst,
  numbered,
  paragraphs,
  renderSections,
  section,
  toItems,
  type PromptContext,
} from "./shared";

/** Concrete meaning of each refinement category. */
export const REFINEMENT_CATEGORIES: Record<string, string> = {
  Spacing:
    "Spacing — bring every margin, padding and gap in this area back onto the spacing scale, make padding inside containers symmetrical, and make gaps between sibling items equal. Space between groups should exceed space within a group.",
  Hierarchy:
    "Hierarchy — make the most important element in this area unmistakably the most prominent, using size, weight and space before color. Demote whatever is currently competing with it.",
  Alignment:
    "Alignment — align edges and baselines to the grid. Stacked text shares one left axis; labels and values align consistently; nothing is off by a few pixels.",
  Typography:
    "Typography — use only the project's type styles. Remove one-off sizes and weights, and keep the number of distinct levels in this area small.",
  Readability:
    "Readability — hold line length to a comfortable measure, check line height against type size, and verify contrast. Do not reduce type size to solve a layout problem.",
  "Component proportions":
    "Component proportions — restore consistent control heights, icon sizes and internal padding. Controls of the same kind must match each other exactly.",
  "Content grouping":
    "Content grouping — group by proximity and alignment first. Merge or remove containers that are only packaging, and separate only where the eye needs it.",
  "Auto Layout":
    "Auto Layout — convert absolutely-positioned content in this area into proper Auto Layout frames with explicit padding, gap, alignment and resizing, so it holds when content length changes.",
  Wrapping:
    "Wrapping — fix awkward wraps, orphans and mid-word breaks. Where text wraps badly, widen the container or adjust the measure rather than shrinking the type.",
  Clipping:
    "Clipping — find anything cut off by a fixed frame size or an overflow setting, and resolve it by expanding the frame.",
  Overflow:
    "Overflow — where content exceeds its container, expand the container. Do not scale content down, tighten spacing below the scale, or hide content to make it fit.",
  "Responsive behavior":
    "Responsive behavior — check resizing rules (hug, fill, fixed) on every frame in this area so it reflows rather than breaking or clipping at other widths.",
  Accessibility:
    "Accessibility — check contrast, focus visibility, hit-target size and label association within this area, and fix what fails. Extend hit areas with padding rather than enlarging the visible control.",
  "Visual consistency":
    "Visual consistency — bring this area back in line with the rest of the screen: same radii, border treatment, icon weight, elevation and color tokens.",
};

const PRESERVATION_BLOCK = [
  "Refine the selected area only.",
  "Do not redesign the page.",
  "Do not modify neighboring approved sections.",
  "Do not restyle, re-space or re-align anything outside the area named above.",
  "Do not change the typefaces, type scale, color tokens, radii or elevation already in use.",
  "Do not reorder, rename, add or remove sections.",
  "Do not rewrite existing copy unless the change explicitly requires it.",
  "Do not swap components for different ones, and do not detach instances that are working.",
  "This is a precision refinement pass, not a redesign. Everything outside the named area is approved and final.",
];

export function compileRefineExisting(brief: RefineBrief, context: PromptContext): string {
  const { contextMode, detail } = context;
  const frame = filled(brief.frameName) ? clean(brief.frameName) : "the selected frame";
  const area = filled(brief.areaBeingChanged) ? clean(brief.areaBeingChanged) : "the selected area";

  const task = paragraphs(
    "You are making a targeted refinement to an existing, approved design. Precision matters more than ambition.",
    lines(`Screen: ${frame}`, `Area to change: ${area}`),
    `Work only inside ${lowerFirst(area)}. The rest of ${frame} is approved and must come out of this pass unchanged.`,
    contextMode === "guidelines"
      ? "The project's Guidelines.md remains authoritative for type, color, spacing, components and accessibility. This pass changes nothing at that level."
      : "",
  );

  const problem = paragraphs(
    filled(brief.currentProblem) ? `What is wrong: ${asSentence(lowerFirst(clean(brief.currentProblem)))}` : "",
    filled(brief.desiredResult) ? `What it should be instead: ${asSentence(lowerFirst(clean(brief.desiredResult)))}` : "",
    explain(
      detail,
      "Diagnose the cause before changing anything — a value off the scale, a missing Auto Layout rule, a fixed height, a weight that is competing — and fix the cause rather than the symptom.",
    ),
  );

  const scope = paragraphs(
    brief.categories.length > 0
      ? `Change exactly these aspects:\n${bullets(brief.categories.map((category) => REFINEMENT_CATEGORIES[category] ?? category))}`
      : "",
    filled(brief.mayChange) ? `You may also change:\n${bullets(toItems(brief.mayChange))}` : "",
    filled(brief.notes) ? asSentence(clean(brief.notes)) : "",
    "Anything not listed here is out of scope. If you believe something outside the scope should change, describe it at the end instead of changing it.",
  );

  const protect = paragraphs(
    filled(brief.untouched) ? `Leave these exactly as they are:\n${bullets(toItems(brief.untouched))}` : "",
    brief.protectExisting
      ? `Non-negotiable for this pass:\n${bullets(
          atLeast(detail, "standard") ? PRESERVATION_BLOCK : PRESERVATION_BLOCK.slice(0, 4).concat(PRESERVATION_BLOCK[8]),
        )}`
      : "",
  );

  return renderSections([
    section("ROLE AND TASK", task),
    section("WHAT IS WRONG", problem),
    section("WHAT SHOULD CHANGE", scope),
    section("WHAT MUST STAY THE SAME", protect),
    section(
      "IF SOMETHING DOES NOT FIT",
      brief.expandContainers
        ? paragraphs(
            EXPANSION_RULE,
            explain(
              detail,
              "If expanding a frame would push neighboring content, extend the parent frame rather than overlapping or clipping.",
            ),
          )
        : "",
    ),
    section("DESIGN SYSTEM — STILL BINDING", designSystemBody(context)),
    section("DO NOT", guardrailsBody(context)),
    section("BEFORE YOU FINISH", closing(detail)),
  ]);
}

function closing(detail: PromptContext["detail"]): string {
  const checks = [
    "Is the stated problem solved at the cause rather than the symptom?",
    "Did anything outside the named area change — position, size, spacing, type, color or content? If so, revert it.",
    "Did anything get smaller, tighter or clipped in order to fit? If so, expand the container instead.",
  ];
  if (atLeast(detail, "standard")) {
    checks.push("Is the refined area still consistent with the rest of the screen?");
    checks.push("Does every value you touched come from the project's spacing and type scales?");
  }
  return lines(
    numbered(checks),
    "",
    "Then state in one short paragraph exactly what you changed, and confirm what you left untouched.",
  );
}
