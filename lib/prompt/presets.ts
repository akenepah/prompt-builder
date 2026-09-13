/**
 * New Screen presets.
 *
 * A preset configures structure — screen type, the sections a screen of
 * this kind usually needs, density, the states worth designing, and the
 * responsive priority. It never invents product content: names, purposes
 * and notes describe the job of a section, and the content fields stay
 * empty for the user to fill.
 */

import { newId } from "./defaults";
import type { NewScreenBrief, SectionSpec } from "./types";

type SectionSeed = Pick<SectionSpec, "name" | "purpose"> & Partial<Pick<SectionSpec, "notes">>;

export interface Preset {
  id: string;
  label: string;
  description: string;
  patch: () => Partial<NewScreenBrief>;
}

function sections(seeds: SectionSeed[]): SectionSpec[] {
  return seeds.map((seed) => ({
    id: newId("sec"),
    name: seed.name,
    purpose: seed.purpose,
    content: "",
    primaryAction: "",
    notes: seed.notes ?? "",
  }));
}

export const PRESETS: Preset[] = [
  {
    id: "landing",
    label: "Landing page",
    description: "One claim, one action, proof underneath.",
    patch: () => ({
      screenType: "Landing page",
      density: "spacious",
      states: ["Default", "Hover", "Focus", "Loading"],
      responsivePriorities:
        "The claim and the primary action must be visible without scrolling at every width. Supporting sections stack in the same order.",
      sections: sections([
        { name: "Entry", purpose: "State what this is and who it is for, in the user's words" },
        { name: "How it works", purpose: "Show the mechanism concretely enough to be believed" },
        { name: "Proof", purpose: "Answer “why should I believe you” with real evidence", notes: "Only real proof — nothing invented." },
        { name: "Objection handling", purpose: "Answer the reason someone would not act" },
        { name: "Close", purpose: "Repeat the single action with the same label as the entry" },
      ]),
    }),
  },
  {
    id: "editorial",
    label: "Content / editorial",
    description: "Reading first, measure and rhythm over chrome.",
    patch: () => ({
      screenType: "Marketing page",
      density: "spacious",
      states: ["Default", "Hover", "Focus"],
      layoutNotes:
        "A single readable measure for body text (around 65–75 characters). Media may break wider than the measure; text never does.",
      responsivePriorities: "Reading comfort wins at every width. Sidebars move below the article rather than compressing the measure.",
      sections: sections([
        { name: "Title block", purpose: "Establish subject, author and context before the first paragraph" },
        { name: "Body", purpose: "The reading surface itself", notes: "Vertical rhythm from the spacing scale; no cards around paragraphs." },
        { name: "Supporting media", purpose: "Carry information the text cannot" },
        { name: "Related", purpose: "Offer the obvious next read without interrupting this one" },
      ]),
    }),
  },
  {
    id: "dashboard",
    label: "Dashboard",
    description: "What needs me, before what happened.",
    patch: () => ({
      screenType: "Dashboard",
      density: "dense",
      states: ["Default", "Hover", "Focus", "Loading", "Empty", "Error"],
      layoutNotes: "Full-width working area. Comparable values align into columns rather than sitting in separate tiles.",
      responsivePriorities: "The headline answer survives to mobile. Tables scroll horizontally with a fixed first column rather than collapsing into cards.",
      sections: sections([
        { name: "Headline answer", purpose: "Say whether anything needs attention, in one line", notes: "Not a row of stat tiles." },
        { name: "Working surface", purpose: "The table, grid or list the user actually works in" },
        { name: "What changed", purpose: "Explain movement since last time, with its cause" },
        { name: "Data freshness", purpose: "Show where the data came from and when it last updated" },
      ]),
    }),
  },
  {
    id: "detail",
    label: "Detail page",
    description: "Identity, status, actions, then detail.",
    patch: () => ({
      screenType: "Detail page",
      density: "balanced",
      states: ["Default", "Hover", "Focus", "Loading", "Error", "Success"],
      layoutNotes: "Keep the object's identity visible while the user scrolls its detail.",
      responsivePriorities: "Identity and status stay at the top on mobile; actions remain reachable without scrolling back up.",
      sections: sections([
        { name: "Identity and status", purpose: "Say what this object is and what state it is in" },
        { name: "Actions", purpose: "Expose what can be done to it right now" },
        { name: "Key attributes", purpose: "The facts most often looked up, scannable as pairs" },
        { name: "History / activity", purpose: "Show what has happened to this object" },
      ]),
    }),
  },
  {
    id: "listing",
    label: "Directory / listing",
    description: "Scanning, filtering, comparing.",
    patch: () => ({
      screenType: "Directory / listing",
      density: "dense",
      states: ["Default", "Hover", "Focus", "Selected", "Loading", "Empty"],
      layoutNotes: "Align the values that get compared into columns. Consistent row height. Filters visible and reversible, never hidden behind an icon.",
      responsivePriorities: "Result count and active filters stay visible at every width. Rows may simplify on mobile but must keep the value being compared.",
      sections: sections([
        { name: "Filters and search", purpose: "Let the user narrow the set and see what is currently applied" },
        { name: "Result summary", purpose: "State how many results and under what filters" },
        { name: "Results", purpose: "The scannable list itself" },
        { name: "Empty state", purpose: "Explain what is missing and how to widen the search" },
      ]),
    }),
  },
  {
    id: "settings",
    label: "Settings",
    description: "Grouped by mental model, consequences stated.",
    patch: () => ({
      screenType: "Settings",
      density: "balanced",
      states: ["Default", "Hover", "Focus", "Disabled", "Loading", "Error", "Success"],
      layoutNotes: "One column of settings at a readable measure. Label on the left or above, control right or below, explanation with the control it explains.",
      sections: sections([
        { name: "Section navigation", purpose: "Let the user find the setting they came for" },
        { name: "Settings groups", purpose: "Group by what the user is trying to change, not by data model" },
        { name: "Destructive actions", purpose: "Isolate irreversible actions and state their consequence", notes: "Separated from everything else, never adjacent to a routine control." },
      ]),
    }),
  },
  {
    id: "mobile",
    label: "Mobile screen",
    description: "One job, thumb-reachable.",
    patch: () => ({
      screenType: "Mobile screen",
      density: "balanced",
      states: ["Default", "Active", "Focus", "Loading", "Empty", "Error"],
      layoutNotes: "Single column. Primary action in the thumb zone. Targets at least 44px with real space between them.",
      responsivePriorities: "Designed at mobile first; scaling up adds width, not new priorities.",
      sections: sections([
        { name: "Context bar", purpose: "Say where the user is and how to get back" },
        { name: "Primary content", purpose: "The one job this screen exists for" },
        { name: "Primary action", purpose: "The action the screen is driving toward, reachable by thumb" },
      ]),
    }),
  },
  {
    id: "onboarding",
    label: "Onboarding",
    description: "Ask the least, explain why.",
    patch: () => ({
      screenType: "Onboarding",
      density: "spacious",
      states: ["Default", "Focus", "Disabled", "Loading", "Error", "Success"],
      layoutNotes: "One decision per step, visible progress, and a way back that does not lose input.",
      sections: sections([
        { name: "Progress", purpose: "Show how far through the user is and what remains" },
        { name: "The ask", purpose: "Request the minimum needed for this step, and say why it is needed" },
        { name: "Advance", purpose: "Move forward, with a way to skip anything not truly required" },
      ]),
    }),
  },
];
