"use client";

/**
 * The four design-brief forms.
 *
 * Grouped into collapsible sections so the first screenful is never a
 * wall of inputs: the groups that materially change prompt quality are
 * open by default, the rest are one click away.
 */

import { PRESETS } from "@/lib/prompt/presets";
import {
  BORROW_OPTIONS,
  DENSITIES,
  QA_DEPTHS,
  QA_OPTIONS,
  REFINEMENT_OPTIONS,
  SCREEN_TYPES,
  STATES,
} from "@/lib/prompt/options";
import type {
  NewScreenBrief,
  QABrief,
  QADepth,
  ReferenceBrief,
  RefineBrief,
} from "@/lib/prompt/types";
import { HierarchyBuilder, SectionBuilder } from "./builders";
import { Button, ChipGroup, Collapsible, Segmented, Select, TextArea, TextInput, Toggle } from "./ui";

function toggleIn(list: string[], option: string): string[] {
  return list.includes(option) ? list.filter((item) => item !== option) : [...list, option];
}

function summarize(value: string, fallback = ""): string {
  const text = value.trim();
  if (!text) return fallback;
  return text.length > 44 ? `${text.slice(0, 44)}…` : text;
}

/* ------------------------------------------------------------------ */
/* new screen                                                          */
/* ------------------------------------------------------------------ */

/** Presets fill structure and anything still empty; they never overwrite what you typed. */
const PRESET_TEXT_KEYS = [
  "screenName",
  "screenType",
  "whatWeAreDesigning",
  "primaryUser",
  "primaryGoal",
  "secondaryGoals",
  "userConcerns",
  "trustFactors",
  "requiredContent",
  "primaryCta",
  "secondaryCta",
  "visualDirection",
  "layoutNotes",
  "referenceNotes",
  "interactionNotes",
  "responsivePriorities",
  "responsiveNotes",
  "screenRules",
  "mustNotHappen",
  "mustPreserve",
] as const;

export function applyPreset(brief: NewScreenBrief, patch: Partial<NewScreenBrief>): NewScreenBrief {
  const next: NewScreenBrief = { ...brief };

  const sectionsAreBlank = brief.sections.every(
    (section) => !section.name.trim() && !section.purpose.trim() && !section.content.trim(),
  );
  if (patch.sections && sectionsAreBlank) next.sections = patch.sections;
  if (patch.states) next.states = patch.states;
  if (patch.density) next.density = patch.density;

  for (const key of PRESET_TEXT_KEYS) {
    const value = patch[key];
    if (typeof value === "string" && value.trim() !== "" && brief[key].trim() === "") {
      next[key] = value;
    }
  }
  return next;
}

export function NewScreenForm({
  brief,
  onChange,
}: {
  brief: NewScreenBrief;
  onChange: (patch: Partial<NewScreenBrief>) => void;
}) {
  return (
    <>
      <Collapsible title="Essentials" defaultOpen summary={summarize(brief.screenName)}>
        <div>
          <p className="mb-2 text-[12px] font-medium text-fpb-ink">Start from a preset</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                size="sm"
                title={preset.description}
                onClick={() => onChange(applyPreset(brief, preset.patch()))}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-fpb-faint">
            Presets set structure and fill empty fields only. They never invent your product’s content.
          </p>
        </div>

        <TextInput
          label="Screen name"
          value={brief.screenName}
          onChange={(screenName) => onChange({ screenName })}
          placeholder="e.g. Account settings"
        />
        <Select
          label="Screen type"
          value={brief.screenType}
          onChange={(screenType) => onChange({ screenType })}
          options={SCREEN_TYPES}
        />
        <TextArea
          label="What are we designing?"
          hint="One or two sentences. What is this screen, and when does someone open it?"
          value={brief.whatWeAreDesigning}
          onChange={(whatWeAreDesigning) => onChange({ whatWeAreDesigning })}
          placeholder="The screen someone opens to check status and decide what to do next."
        />
      </Collapsible>

      <Collapsible title="User & purpose" defaultOpen summary={summarize(brief.primaryGoal)}>
        <TextInput
          label="Primary user"
          hint="Who is on this screen, and in what situation?"
          value={brief.primaryUser}
          onChange={(primaryUser) => onChange({ primaryUser })}
          placeholder="Who they are, and what situation they are in"
        />
        <TextArea
          label="Primary goal"
          hint="What is the most important thing someone needs to accomplish here?"
          value={brief.primaryGoal}
          onChange={(primaryGoal) => onChange({ primaryGoal })}
          rows={2}
          placeholder="the one thing they must be able to accomplish here"
        />
        <TextArea
          label="Secondary goals"
          hint="One per line. Supported, but never at the expense of the primary goal."
          value={brief.secondaryGoals}
          onChange={(secondaryGoals) => onChange({ secondaryGoals })}
        />
        <TextArea
          label="What is the user unsure about?"
          hint="One per line. The questions and doubts they arrive with — the design has to answer them in place."
          value={brief.userConcerns}
          onChange={(userConcerns) => onChange({ userConcerns })}
        />
        <TextInput
          label="What needs to feel clear or trustworthy?"
          value={brief.trustFactors}
          onChange={(trustFactors) => onChange({ trustFactors })}
        />
      </Collapsible>

      <Collapsible
        title="Content & structure"
        defaultOpen
        summary={`${brief.sections.filter((section) => section.name.trim()).length} sections`}
      >
        <SectionBuilder sections={brief.sections} onChange={(sections) => onChange({ sections })} />
        <TextArea
          label="Required content"
          hint="One per line. Anything that must appear on the screen."
          value={brief.requiredContent}
          onChange={(requiredContent) => onChange({ requiredContent })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Primary action"
            value={brief.primaryCta}
            onChange={(primaryCta) => onChange({ primaryCta })}
            placeholder="Primary button label"
          />
          <TextInput
            label="Secondary action"
            value={brief.secondaryCta}
            onChange={(secondaryCta) => onChange({ secondaryCta })}
            placeholder="Secondary button label"
          />
        </div>
      </Collapsible>

      <Collapsible
        title="Information hierarchy"
        defaultOpen
        summary={summarize(brief.hierarchy[0]?.text ?? "")}
      >
        <p className="text-[12px] leading-[1.5] text-fpb-muted">
          What should the user notice first, second, third? This is the single biggest lever on prompt quality — it
          is what stops Figma giving every section the same weight.
        </p>
        <HierarchyBuilder items={brief.hierarchy} onChange={(hierarchy) => onChange({ hierarchy })} />
      </Collapsible>

      <Collapsible title="Visual direction" summary={summarize(brief.visualDirection)}>
        <TextArea
          label="Visual direction"
          hint="Describe the feeling in concrete terms — “reads like a printed timetable”, not “modern and clean”."
          value={brief.visualDirection}
          onChange={(visualDirection) => onChange({ visualDirection })}
        />
        <TextArea
          label="Layout notes"
          hint="Width, columns, what sits beside what, anything full-bleed."
          value={brief.layoutNotes}
          onChange={(layoutNotes) => onChange({ layoutNotes })}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-fpb-ink">Density</span>
          <Segmented
            label="Density"
            className="self-start"
            value={brief.density || "balanced"}
            options={DENSITIES}
            onChange={(density) => onChange({ density })}
          />
        </div>
        <TextArea
          label="Reference notes"
          hint="Optional. Anything you are loosely referencing for this screen."
          value={brief.referenceNotes}
          onChange={(referenceNotes) => onChange({ referenceNotes })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title="Behavior & states" summary={`${brief.states.length} states`}>
        <TextArea
          label="Interaction notes"
          value={brief.interactionNotes}
          onChange={(interactionNotes) => onChange({ interactionNotes })}
        />
        <ChipGroup
          label="States to design"
          hint="Each selected state becomes a concrete instruction, not just a word."
          options={STATES}
          selected={brief.states}
          onToggle={(state) => onChange({ states: toggleIn(brief.states, state) })}
        />
      </Collapsible>

      <Collapsible title="Responsive" summary={summarize(brief.responsivePriorities)}>
        <TextArea
          label="Responsive priorities"
          hint="What must survive to mobile intact?"
          value={brief.responsivePriorities}
          onChange={(responsivePriorities) => onChange({ responsivePriorities })}
        />
        <TextArea
          label="Desktop / tablet / mobile notes"
          value={brief.responsiveNotes}
          onChange={(responsiveNotes) => onChange({ responsiveNotes })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title="Constraints" summary={summarize(brief.mustNotHappen)}>
        <TextArea
          label="Screen-specific rules"
          hint="One per line."
          value={brief.screenRules}
          onChange={(screenRules) => onChange({ screenRules })}
        />
        <TextArea
          label="Things that must not happen"
          hint="One per line."
          value={brief.mustNotHappen}
          onChange={(mustNotHappen) => onChange({ mustNotHappen })}
        />
        <TextArea
          label="Things that must be preserved"
          hint="One per line. Anything already approved that this screen must keep."
          value={brief.mustPreserve}
          onChange={(mustPreserve) => onChange({ mustPreserve })}
        />
      </Collapsible>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* reference translation                                               */
/* ------------------------------------------------------------------ */

export function ReferenceForm({
  brief,
  onChange,
}: {
  brief: ReferenceBrief;
  onChange: (patch: Partial<ReferenceBrief>) => void;
}) {
  return (
    <>
      <Collapsible title="Target" defaultOpen summary={summarize(brief.targetScreen)}>
        <TextInput
          label="Target screen"
          value={brief.targetScreen}
          onChange={(targetScreen) => onChange({ targetScreen })}
          placeholder="The screen you are designing"
        />
        <TextArea
          label="What are we creating?"
          value={brief.whatWeAreCreating}
          onChange={(whatWeAreCreating) => onChange({ whatWeAreCreating })}
          rows={2}
        />
        <TextArea
          label="Primary goal on this screen"
          hint="What the user is trying to do. Borrowed principles that do not serve it get dropped."
          value={brief.primaryGoal}
          onChange={(primaryGoal) => onChange({ primaryGoal })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title="The reference" defaultOpen summary={summarize(brief.referenceName)}>
        <TextInput
          label="Reference name or source"
          value={brief.referenceName}
          onChange={(referenceName) => onChange({ referenceName })}
          placeholder="Screenshot, site, or Figma frame"
        />
        <TextArea
          label="What is it, and what works about it?"
          hint="Describe the reference in your own words — the prompt turns this into a structural analysis instruction."
          value={brief.referenceDescription}
          onChange={(referenceDescription) => onChange({ referenceDescription })}
        />
      </Collapsible>

      <Collapsible title="What to borrow" defaultOpen summary={`${brief.borrowAspects.length} selected`}>
        <ChipGroup
          label="Borrow the principles behind"
          hint="Each one expands into what to analyze and how to translate it."
          options={BORROW_OPTIONS}
          selected={brief.borrowAspects}
          onToggle={(aspect) => onChange({ borrowAspects: toggleIn(brief.borrowAspects, aspect) })}
        />
        <TextArea
          label="Specifically borrow"
          hint="One per line."
          value={brief.specificallyBorrow}
          onChange={(specificallyBorrow) => onChange({ specificallyBorrow })}
        />
        <TextArea
          label="Do not borrow"
          hint="One per line. Type, color and content are already excluded automatically."
          value={brief.doNotBorrow}
          onChange={(doNotBorrow) => onChange({ doNotBorrow })}
        />
      </Collapsible>

      <Collapsible title="What stays ours" defaultOpen summary={summarize(brief.mustRemainOurs)}>
        <TextArea
          label="Must remain unmistakably ours"
          hint="One per line."
          value={brief.mustRemainOurs}
          onChange={(mustRemainOurs) => onChange({ mustRemainOurs })}
        />
        <TextArea
          label="Required content on the target screen"
          hint="One per line."
          value={brief.requiredContent}
          onChange={(requiredContent) => onChange({ requiredContent })}
        />
      </Collapsible>

      <Collapsible title="Information hierarchy" summary={summarize(brief.hierarchy[0]?.text ?? "")}>
        <p className="text-[12px] leading-[1.5] text-fpb-muted">
          If the reference’s composition would disturb this order, the prompt tells Figma to change the composition —
          not the order.
        </p>
        <HierarchyBuilder items={brief.hierarchy} onChange={(hierarchy) => onChange({ hierarchy })} />
      </Collapsible>

      <Collapsible title="Constraints" summary={summarize(brief.constraints)}>
        <TextArea
          label="Additional constraints"
          hint="One per line."
          value={brief.constraints}
          onChange={(constraints) => onChange({ constraints })}
        />
      </Collapsible>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* refine existing                                                     */
/* ------------------------------------------------------------------ */

export function RefineForm({
  brief,
  onChange,
}: {
  brief: RefineBrief;
  onChange: (patch: Partial<RefineBrief>) => void;
}) {
  return (
    <>
      <Collapsible title="Scope" defaultOpen summary={summarize(brief.areaBeingChanged)}>
        <TextInput
          label="Screen / frame name"
          value={brief.frameName}
          onChange={(frameName) => onChange({ frameName })}
          placeholder="Frame name as it appears in Figma"
        />
        <TextArea
          label="Area being changed"
          hint="Name it precisely. This is what keeps Figma out of the rest of the screen."
          value={brief.areaBeingChanged}
          onChange={(areaBeingChanged) => onChange({ areaBeingChanged })}
          rows={2}
          placeholder="the section you want changed"
        />
      </Collapsible>

      <Collapsible title="The problem" defaultOpen summary={summarize(brief.currentProblem)}>
        <TextArea
          label="Current problem"
          hint="Be concrete — what is actually wrong, not how it feels."
          value={brief.currentProblem}
          onChange={(currentProblem) => onChange({ currentProblem })}
        />
        <TextArea
          label="Desired result"
          value={brief.desiredResult}
          onChange={(desiredResult) => onChange({ desiredResult })}
        />
      </Collapsible>

      <Collapsible title="Boundaries" defaultOpen summary={brief.protectExisting ? "Protected" : "Unprotected"}>
        <TextArea
          label="What must stay untouched?"
          hint="One per line."
          value={brief.untouched}
          onChange={(untouched) => onChange({ untouched })}
        />
        <TextArea
          label="What may change?"
          hint="One per line. Optional."
          value={brief.mayChange}
          onChange={(mayChange) => onChange({ mayChange })}
          rows={2}
        />
        <div className="flex flex-col gap-3 rounded border border-fpb-line bg-fpb-inset/60 p-3">
          <Toggle
            label="Protect existing design"
            hint="Adds the full preservation block: refine the selected area only, do not redesign the page, do not touch neighboring approved sections."
            checked={brief.protectExisting}
            onChange={(protectExisting) => onChange({ protectExisting })}
          />
          <Toggle
            label="Expand containers when necessary"
            hint="Tells Figma to grow the parent frame rather than shrink type, compress spacing or clip content."
            checked={brief.expandContainers}
            onChange={(expandContainers) => onChange({ expandContainers })}
          />
        </div>
      </Collapsible>

      <Collapsible title="Refinement categories" defaultOpen summary={`${brief.categories.length} selected`}>
        <ChipGroup
          label="Work on exactly these"
          hint="Anything not selected is explicitly out of scope."
          options={REFINEMENT_OPTIONS}
          selected={brief.categories}
          onToggle={(category) => onChange({ categories: toggleIn(brief.categories, category) })}
        />
        <TextArea
          label="Notes"
          value={brief.notes}
          onChange={(notes) => onChange({ notes })}
          rows={2}
        />
      </Collapsible>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* design QA                                                           */
/* ------------------------------------------------------------------ */

export function QAForm({
  brief,
  onChange,
}: {
  brief: QABrief;
  onChange: (patch: Partial<QABrief>) => void;
}) {
  return (
    <>
      <Collapsible title="Scope" defaultOpen summary={summarize(brief.frameName)}>
        <TextInput
          label="Screen / frame"
          value={brief.frameName}
          onChange={(frameName) => onChange({ frameName })}
          placeholder="Frame name as it appears in Figma"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-fpb-ink">QA depth</span>
          <Segmented
            label="QA depth"
            className="self-start"
            value={brief.depth}
            options={QA_DEPTHS.map((depth) => ({ id: depth.id as QADepth, label: depth.label, hint: depth.hint }))}
            onChange={(depth) => onChange({ depth })}
          />
          <p className="text-[12px] text-fpb-faint">
            {QA_DEPTHS.find((depth) => depth.id === brief.depth)?.hint}
          </p>
        </div>
      </Collapsible>

      <Collapsible title="What to inspect" defaultOpen summary={`${brief.categories.length} checks`}>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => onChange({ categories: [...QA_OPTIONS] })}>
            Select all
          </Button>
          <Button size="sm" onClick={() => onChange({ categories: [] })}>
            Clear
          </Button>
        </div>
        <ChipGroup
          label="Inspection checklist"
          hint="Each check expands into the specific things a reviewer would actually look for."
          options={QA_OPTIONS}
          selected={brief.categories}
          onToggle={(category) => onChange({ categories: toggleIn(brief.categories, category) })}
        />
      </Collapsible>

      <Collapsible title="Context" defaultOpen summary={summarize(brief.knownIssues)}>
        <TextArea
          label="Known issues"
          hint="One per line. These get fixed at the cause first, then the full inspection continues."
          value={brief.knownIssues}
          onChange={(knownIssues) => onChange({ knownIssues })}
        />
        <TextArea
          label="Must remain unchanged"
          hint="One per line."
          value={brief.unchanged}
          onChange={(unchanged) => onChange({ unchanged })}
        />
        <TextArea
          label="Additional notes"
          value={brief.notes}
          onChange={(notes) => onChange({ notes })}
          rows={2}
        />
        <div className="rounded border border-fpb-line bg-fpb-inset/60 p-3">
          <Toggle
            label="Expand containers when necessary"
            hint="Fix overflow by growing the frame, never by shrinking type or clipping content."
            checked={brief.expandContainers}
            onChange={(expandContainers) => onChange({ expandContainers })}
          />
        </div>
      </Collapsible>
    </>
  );
}
