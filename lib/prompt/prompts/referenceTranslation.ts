/**
 * REFERENCE TRANSLATION — use a screenshot, site or frame as a source of
 * structural principles, never as something to copy.
 *
 * The output deliberately separates REFERENCE PRINCIPLES (what to learn)
 * from TARGET PRODUCT RULES (what must stay ours), and states which side
 * wins when they disagree.
 */

import type { ProjectProfile, ReferenceBrief } from "../types";
import {
  CONTENT_HONESTY_RULE,
  EXPANSION_RULE,
  ROLE_LINE,
  accessibilityBody,
  asSentence,
  bullets,
  clean,
  designSystemBody,
  filled,
  finalReviewBody,
  guardrailsBody,
  lines,
  lowerFirst,
  numbered,
  paragraphs,
  projectContextLine,
  renderSections,
  responsiveBody,
  section,
  toItems,
} from "./shared";

/** What it actually means to "borrow" each aspect of a reference. */
export const BORROW_ASPECTS: Record<string, string> = {
  "Overall composition":
    "Overall composition — how the page is divided, where weight sits, what gets full width versus what is constrained, and how the eye is led down the page.",
  Grid:
    "Grid — column count, how content spans it, where the layout deliberately breaks the grid, and how wide the readable measure is.",
  Spacing:
    "Spacing — the ratio between space around sections and space inside them, and how consistently a scale is applied.",
  "Typography hierarchy":
    "Typography hierarchy — how many distinct type levels are in use, the size and weight jump between them, and how much work weight does versus size.",
  "Content density":
    "Content density — how much information is placed per screen, and what is shown at rest versus revealed on demand.",
  Navigation:
    "Navigation — how orientation and wayfinding are handled, and how much persistent chrome the design tolerates.",
  "Component treatment":
    "Component treatment — how restrained or expressive the components are, and when the design uses a container versus plain spacing.",
  Imagery:
    "Imagery — the role images play, their crop and aspect ratios, and how they relate to text.",
  "Color balance":
    "Color balance — the ratio of neutral to accent, and where accent is permitted to appear.",
  "Visual rhythm":
    "Visual rhythm — the pattern of alternating density, alignment and section heights that keeps a long page from feeling flat.",
  "Interaction pattern":
    "Interaction pattern — the mechanics of how the user moves through content, not the styling of the controls.",
};

export function compileReferenceTranslation(
  brief: ReferenceBrief,
  project: ProjectProfile | null,
  guardrails: boolean,
): string {
  const productName = project && filled(project.name) ? clean(project.name) : "our product";
  const target = filled(brief.targetScreen) ? clean(brief.targetScreen) : "the target screen";

  const task = paragraphs(
    ROLE_LINE,
    lines(
      `Use the supplied reference as a source of design principles for ${target} in ${productName}.`,
      filled(brief.whatWeAreCreating) && asSentence(clean(brief.whatWeAreCreating)),
    ),
    "This is a translation, not a reproduction. Extract why the reference works, then rebuild that thinking with our content, our design system and our users. Do not copy its layout, its type, its colors or its components.",
  );

  const analyze = paragraphs(
    lines(
      filled(brief.referenceName) && `Reference: ${clean(brief.referenceName)}`,
      filled(brief.referenceDescription) && asSentence(clean(brief.referenceDescription)),
    ),
    "First, analyze the reference structurally before designing anything. Describe to yourself, in order: its structure and composition, its grid, its typographic hierarchy, its spacing system and rhythm, its component language, its use of imagery, and its content density. Identify the specific decisions that make it work.",
    brief.borrowAspects.length > 0
      ? `Pay particular attention to:\n${bullets(brief.borrowAspects.map((aspect) => BORROW_ASPECTS[aspect] ?? aspect))}`
      : "",
    filled(brief.specificallyBorrow) ? `Specifically borrow:\n${bullets(toItems(brief.specificallyBorrow))}` : "",
    "Then state the underlying principle for each of those observations, and apply the principle — not the appearance.",
  );

  const doNotBorrow = paragraphs(
    filled(brief.doNotBorrow) ? `Do not carry over:\n${bullets(toItems(brief.doNotBorrow))}` : "",
    `Never carry over, whatever the brief says:\n${bullets([
      "The reference's typefaces, type sizes and color values.",
      "Its brand voice, illustration style, iconography and photography treatment.",
      "Its specific components, ornaments and effects.",
      "Any of its content — no copied headlines, labels, figures or feature names.",
    ])}`,
  );

  const ours = paragraphs(
    filled(brief.mustRemainOurs) ? `These must stay unmistakably ours:\n${bullets(toItems(brief.mustRemainOurs))}` : "",
    "Our design system, our terminology, our content model and our users' priorities are fixed. Where the reference conflicts with any of them, our system wins without discussion. A result that looks like the reference but breaks our system is a failure.",
  );

  const hierarchy = brief.hierarchy.map((item) => clean(item.text)).filter(Boolean);

  return renderSections([
    section("ROLE AND TASK", task),
    section("PRODUCT CONTEXT", projectContextLine(project)),
    section("REFERENCE ANALYSIS — WHAT TO LEARN", analyze),
    section("REFERENCE PRINCIPLES — HOW TO APPLY THEM", referencePrinciplesBody()),
    section("DO NOT BORROW", doNotBorrow),
    section("TARGET PRODUCT RULES — WHAT STAYS OURS", ours),
    section(
      "TARGET SCREEN",
      paragraphs(
        filled(brief.primaryGoal)
          ? `The user's job on this screen is to ${lowerFirst(clean(brief.primaryGoal))}. Every borrowed principle must serve that job; discard any that does not.`
          : "",
        filled(brief.requiredContent) ? `Required content:\n${bullets(toItems(brief.requiredContent))}` : "",
        hierarchy.length > 0
          ? `The user should notice things in this order:\n${numbered(hierarchy)}\nIf the reference's composition would disturb this order, change the composition, not the order.`
          : "",
        CONTENT_HONESTY_RULE,
      ),
    ),
    section("DESIGN SYSTEM — NON-NEGOTIABLE", designSystemBody(project)),
    section("LAYOUT", paragraphs("Build with real Auto Layout, consistent padding and gaps from our spacing scale, and alignment to our grid.", EXPANSION_RULE)),
    section("RESPONSIVE BEHAVIOR", responsiveBody(project)),
    section("ACCESSIBILITY", accessibilityBody(project)),
    section(
      "CONSTRAINTS",
      paragraphs(
        filled(brief.constraints) ? bullets(toItems(brief.constraints)) : "",
        guardrails ? guardrailsBody(project) : project ? bullets(toItems(project.doNotRules)) : "",
      ),
    ),
    section(
      "FINAL DESIGN REVIEW",
      paragraphs(
        finalReviewBody(),
        "Then answer two more: could someone tell this was informed by the reference without recognizing it as a copy, and would this still look like our product if the reference were taken away?",
      ),
    ),
  ]);
}

function referencePrinciplesBody(): string {
  return lines(
    "Translate every observation into a principle stated in our terms before you use it. For example:",
    bullets([
      "\"Their hero is large\" becomes \"the entry point to the page states one idea and is given more vertical space than anything that follows\".",
      "\"They use cards\" becomes \"items that are compared side by side are given equal weight and a shared alignment\".",
      "\"Lots of whitespace\" becomes \"space between sections is roughly twice the space inside them\".",
    ]),
    "Apply the principle with our type, our color, our spacing scale and our components. If a principle cannot be expressed within our system, drop it.",
  );
}
