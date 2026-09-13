/**
 * REFINE EXISTING — a precision pass on part of an approved screen.
 *
 * Figma AI over-corrects: asked to fix one section it will happily
 * restyle the page. The preservation language here is the whole point of
 * the mode, so it is stated early, stated strongly, and repeated in the
 * closing check.
 */

import type { ProjectProfile, RefineBrief } from "../types";
import {
  EXPANSION_RULE,
  asSentence,
  bullets,
  clean,
  designSystemBody,
  filled,
  guardrailsBody,
  lines,
  lowerFirst,
  numbered,
  paragraphs,
  renderSections,
  section,
  toItems,
} from "./shared";

/** Concrete meaning of each refinement category. */
export const REFINEMENT_CATEGORIES: Record<string, string> = {
  Spacing:
    "Spacing — bring every margin, padding and gap in this area back onto the spacing scale, make the padding inside containers symmetrical, and make the space between sibling items equal. Space between groups should be visibly larger than space within a group.",
  Hierarchy:
    "Hierarchy — make the most important element in this area unmistakably the most prominent, using size, weight and space before color. Demote whatever is currently competing with it.",
  Alignment:
    "Alignment — align edges and baselines to the grid. Left edges of stacked text should share one axis; labels and values should align consistently; nothing should be off by a few pixels.",
  Typography:
    "Typography — use only the project's type styles. Remove one-off sizes and weights, keep the number of distinct levels in this area small, and make the jump between levels deliberate.",
  Readability:
    "Readability — hold line length to a comfortable measure, check line height against type size, and verify contrast of body and secondary text. Do not reduce type size to solve a layout problem.",
  "Component proportions":
    "Component proportions — restore consistent control heights, icon sizes, and internal padding. Buttons, inputs and rows of the same kind must match each other exactly.",
  "Content grouping":
    "Content grouping — group by proximity and alignment first. Merge or remove containers that are only packaging, and add separation only where the eye actually needs it.",
  "Auto Layout":
    "Auto Layout — convert absolutely-positioned content in this area into proper Auto Layout frames with explicit padding, gap, alignment and resizing behavior, so the area holds up when content length changes.",
  Wrapping:
    "Wrapping — fix awkward wraps, orphans and mid-word breaks. Where text wraps badly, widen the container or adjust the measure rather than shrinking the type.",
  Clipping:
    "Clipping — find anything cut off by a fixed frame height, a fixed width or an overflow setting, and resolve it by expanding the frame.",
  Overflow:
    "Overflow — where content exceeds its container, expand the container. Do not scale content down, tighten spacing below the scale, or hide content to make it fit.",
  "Responsive behavior":
    "Responsive behavior — check the resizing rules (hug, fill, fixed) on every frame in this area so it reflows correctly rather than breaking or clipping at other widths.",
  Accessibility:
    "Accessibility — check contrast, focus visibility, target size and label association within this area, and fix anything that fails.",
  "Visual consistency":
    "Visual consistency — bring this area back in line with the rest of the screen: same radii, same border treatment, same icon weight, same elevation rules, same color tokens.",
};

const PRESERVATION_BLOCK = [
  "Refine the selected area only.",
  "Do not redesign the page.",
  "Do not modify neighboring approved sections.",
  "Do not restyle, re-space or re-align anything outside the area named above.",
  "Do not change the typefaces, type scale, color tokens, radii or elevation rules already in use.",
  "Do not reorder, rename, add or remove sections.",
  "Do not rewrite existing copy unless the change explicitly requires it.",
  "Do not swap components for different ones, and do not detach instances that are working.",
  "Do not introduce new visual motifs, containers, icons, badges or decoration.",
  "This is a precision refinement pass, not a redesign. Everything outside the named area is approved and final.",
];

export function compileRefineExisting(
  brief: RefineBrief,
  project: ProjectProfile | null,
  guardrails: boolean,
): string {
  const frame = filled(brief.frameName) ? clean(brief.frameName) : "the selected frame";
  const area = filled(brief.areaBeingChanged) ? clean(brief.areaBeingChanged) : "the selected area";

  const task = paragraphs(
    "You are acting as a senior product designer making a targeted refinement to an existing, approved design. Precision matters more than ambition here.",
    lines(`Screen: ${frame}`, `Area to change: ${area}`),
    `Work only inside ${lowerFirst(area)}. The rest of ${frame} has already been reviewed and approved and must come out of this pass unchanged.`,
  );

  const problem = paragraphs(
    filled(brief.currentProblem) ? `What is wrong today: ${asSentence(lowerFirst(clean(brief.currentProblem)))}` : "",
    filled(brief.desiredResult) ? `What it should be instead: ${asSentence(lowerFirst(clean(brief.desiredResult)))}` : "",
    "Diagnose the cause before changing anything. Fix the cause — a spacing value off the scale, a missing Auto Layout rule, a fixed height, a weight that is competing — rather than nudging the symptom.",
  );

  const scope = paragraphs(
    brief.categories.length > 0
      ? `Work on exactly these aspects:\n${bullets(brief.categories.map((category) => REFINEMENT_CATEGORIES[category] ?? category))}`
      : "",
    filled(brief.mayChange) ? `You may also change:\n${bullets(toItems(brief.mayChange))}` : "",
    filled(brief.notes) ? asSentence(clean(brief.notes)) : "",
    "Anything not listed here is out of scope. If you believe something outside the scope should change, describe it at the end instead of changing it.",
  );

  const protect = paragraphs(
    filled(brief.untouched) ? `Leave these exactly as they are:\n${bullets(toItems(brief.untouched))}` : "",
    brief.protectExisting ? `Non-negotiable for this pass:\n${bullets(PRESERVATION_BLOCK)}` : "",
  );

  const overflow = brief.expandContainers
    ? paragraphs(
        EXPANSION_RULE,
        "Growing a frame is always the correct answer over compressing the design. If expanding a frame would push neighboring content, extend the parent frame rather than overlapping or clipping.",
      )
    : "";

  return renderSections([
    section("ROLE AND TASK", task),
    brief.protectExisting
      ? section(
          "SCOPE — READ BEFORE CHANGING ANYTHING",
          lines(
            `This is a precision refinement of ${lowerFirst(area)} inside ${frame}.`,
            "Refine the selected area only. Do not redesign the page. Do not modify neighboring approved sections.",
          ),
        )
      : null,
    section("THE PROBLEM", problem),
    section("WHAT TO CHANGE", scope),
    section("WHAT MUST NOT CHANGE", protect),
    section("IF SOMETHING DOES NOT FIT", overflow),
    section("DESIGN SYSTEM — STILL BINDING", designSystemBody(project)),
    section(
      "DO NOT",
      paragraphs(
        guardrails ? guardrailsBody(project) : project ? bullets(toItems(project.doNotRules)) : "",
        "Do not use this pass as an opportunity to improve things nobody asked about.",
      ),
    ),
    section(
      "BEFORE YOU FINISH",
      lines(
        numbered([
          "Is the stated problem actually solved, at the cause rather than the symptom?",
          "Did anything outside the named area change in any way — position, size, spacing, type, color, content? If so, revert it.",
          "Is the refined area still consistent with the rest of the screen, or does it now look like it came from a different design?",
          "Did anything get smaller, tighter or clipped in order to fit? If so, expand the container instead.",
          "Does every value you touched come from the project's spacing and type scales?",
        ]),
        "",
        "Then list, in one short paragraph, exactly what you changed and confirm what you left untouched.",
      ),
    ),
  ]);
}
