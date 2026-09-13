/**
 * REFERENCE TRANSLATION — use a screenshot, site or frame as a source of
 * structural principles, never as something to copy.
 *
 * The output keeps REFERENCE PRINCIPLES (what to learn) and TARGET
 * PRODUCT RULES (what stays ours) as separate, clearly labelled
 * sections, and states which side wins when they disagree.
 */

import type { ReferenceBrief } from "../types";
import {
  EXPANSION_RULE,
  accessibilityBody,
  asSentence,
  atLeast,
  bullets,
  clean,
  contentHonestyBody,
  designSystemBody,
  explain,
  filled,
  finalReviewBody,
  guardrailsBody,
  lines,
  lowerFirst,
  numbered,
  paragraphs,
  productContextBody,
  renderSections,
  responsiveBody,
  section,
  toItems,
  type PromptContext,
} from "./shared";

/** What it actually means to "borrow" each aspect of a reference. */
export const BORROW_ASPECTS: Record<string, string> = {
  "Overall composition":
    "Overall composition — how the page is divided, where weight sits, what gets full width versus what is constrained, and how the eye is led down the page.",
  Grid: "Grid — column count, how content spans it, where the layout deliberately breaks the grid, and how wide the readable measure is.",
  Spacing: "Spacing — the ratio between space around sections and space inside them, and how consistently a scale is applied.",
  "Typography hierarchy":
    "Typography hierarchy — how many distinct type levels are in use, the size and weight jump between them, and how much work weight does versus size.",
  "Content density": "Content density — how much information sits on a screen, and what is shown at rest versus revealed on demand.",
  Navigation: "Navigation — how orientation and wayfinding are handled, and how much persistent chrome the design tolerates.",
  "Component treatment":
    "Component treatment — how restrained or expressive the components are, and when the design uses a container versus plain spacing.",
  Imagery: "Imagery — the role images play, their crop and aspect ratios, and how they relate to text.",
  "Color balance": "Color balance — the ratio of neutral to accent, and where accent is permitted to appear.",
  "Visual rhythm":
    "Visual rhythm — the pattern of alternating density, alignment and section heights that keeps a long page from feeling flat.",
  "Interaction pattern": "Interaction pattern — how the user moves through content, not the styling of the controls.",
};

export function compileReferenceTranslation(brief: ReferenceBrief, context: PromptContext): string {
  const { project, contextMode, detail } = context;
  const productName = project && filled(project.name) ? clean(project.name) : "our product";
  const target = filled(brief.targetScreen) ? clean(brief.targetScreen) : "the target screen";

  const task = paragraphs(
    "You are acting as a senior product designer. Use the supplied reference as a source of design principles, not as something to reproduce.",
    lines(
      `Design ${target} for ${productName}, informed by the reference below.`,
      filled(brief.whatWeAreCreating) && asSentence(clean(brief.whatWeAreCreating)),
    ),
    "This is a translation, not a reproduction. Extract why the reference works, then rebuild that thinking with our content, our design system and our users. Do not copy its layout, type, color or components.",
  );

  const analyze = paragraphs(
    lines(
      filled(brief.referenceName) && `Reference: ${clean(brief.referenceName)}`,
      filled(brief.referenceDescription) && asSentence(clean(brief.referenceDescription)),
    ),
    "Analyze the reference structurally before designing anything: its composition, grid, typographic hierarchy, spacing rhythm, component language, imagery and content density. Identify the specific decisions that make it work.",
    brief.borrowAspects.length > 0
      ? `Pay particular attention to:\n${bullets(brief.borrowAspects.map((aspect) => BORROW_ASPECTS[aspect] ?? aspect))}`
      : "",
    filled(brief.specificallyBorrow) ? `Specifically borrow:\n${bullets(toItems(brief.specificallyBorrow))}` : "",
  );

  const principles = lines(
    "State each observation as a principle in our terms before using it, then apply the principle — not the appearance.",
    explain(
      detail,
      bullets([
        '"Their hero is large" becomes "the entry point states one idea and is given more vertical space than anything that follows".',
        '"They use cards" becomes "items that are compared side by side get equal weight and a shared alignment".',
        '"Lots of whitespace" becomes "space between sections is roughly twice the space inside them".',
      ]),
    ),
    "If a principle cannot be expressed within our system, drop it.",
  );

  const ours = paragraphs(
    filled(brief.mustRemainOurs) ? `These must stay unmistakably ours:\n${bullets(toItems(brief.mustRemainOurs))}` : "",
    contextMode === "guidelines"
      ? "Our Guidelines.md is authoritative: our typography, color, spacing, grid, components, terminology and accessibility rules all come from it. Where the reference conflicts with Guidelines.md, Guidelines.md wins without discussion."
      : "Our design system, terminology, content model and users' priorities are fixed. Where the reference conflicts with any of them, our system wins without discussion.",
    explain(detail, "A result that looks like the reference but breaks our system is a failure."),
  );

  const hierarchy = brief.hierarchy.map((item) => clean(item.text)).filter(Boolean);

  return renderSections([
    section("ROLE AND TASK", task),
    section("PROJECT CONTEXT", productContextBody(context)),
    section("REFERENCE ANALYSIS — WHAT TO LEARN", analyze),
    section("REFERENCE PRINCIPLES — HOW TO APPLY THEM", principles),
    section(
      "DO NOT BORROW",
      paragraphs(
        filled(brief.doNotBorrow) ? `Do not carry over:\n${bullets(toItems(brief.doNotBorrow))}` : "",
        `Never carry over, whatever else this brief says:\n${bullets([
          "The reference's typefaces, type sizes and color values.",
          "Its brand voice, illustration style, iconography and photography treatment.",
          "Its specific components, ornaments and effects.",
          "Any of its content — no copied headlines, labels, figures or feature names.",
        ])}`,
      ),
    ),
    section("TARGET PRODUCT RULES — WHAT STAYS OURS", ours),
    section(
      "TARGET SCREEN",
      paragraphs(
        filled(brief.primaryGoal)
          ? `The user's job here is to ${lowerFirst(clean(brief.primaryGoal))}. Every borrowed principle must serve that job; discard any that does not.`
          : "",
        filled(brief.requiredContent) ? `Required content:\n${bullets(toItems(brief.requiredContent))}` : "",
        hierarchy.length > 0
          ? `The user should notice things in this order:\n${numbered(hierarchy)}\nIf the reference's composition would disturb this order, change the composition, not the order.`
          : "",
        contentHonestyBody(),
      ),
    ),
    section("DESIGN SYSTEM — NON-NEGOTIABLE", designSystemBody(context)),
    section(
      "LAYOUT",
      paragraphs(
        explain(detail, "Build with real Auto Layout, consistent padding and gaps from our spacing scale, and alignment to our grid."),
        contextMode === "embedded" && atLeast(detail, "standard") ? EXPANSION_RULE : "",
      ),
    ),
    section("RESPONSIVE BEHAVIOR", responsiveBody(context)),
    section("ACCESSIBILITY", accessibilityBody(context)),
    section(
      "CONSTRAINTS",
      paragraphs(filled(brief.constraints) ? bullets(toItems(brief.constraints)) : "", guardrailsBody(context)),
    ),
    section(
      "BEFORE YOU FINISH",
      paragraphs(
        finalReviewBody(detail),
        "Then answer two more: could someone tell this was informed by the reference without recognizing it as a copy, and would this still look like our product if the reference were taken away?",
      ),
    ),
  ]);
}
