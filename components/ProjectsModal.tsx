"use client";

/**
 * Project profiles — the persistent design rules that carry into every
 * prompt, so they are written once instead of retyped per brief.
 */

import { BookOpen, Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { duplicateProject, emptyProject, sampleProject } from "@/lib/prompt/defaults";
import type { ProjectProfile } from "@/lib/prompt/types";
import { ColorTokenBuilder } from "./builders";
import { Button, Collapsible, Modal, TextArea, TextInput } from "./ui";

export function ProjectsModal({
  projects,
  activeId,
  defaultId,
  onSave,
  onSelect,
  onSetDefault,
  onViewGuidelines,
  onClose,
}: {
  projects: ProjectProfile[];
  activeId: string;
  defaultId: string;
  onSave: (projects: ProjectProfile[]) => void;
  onSelect: (id: string) => void;
  onSetDefault: (id: string) => void;
  onViewGuidelines: (id: string) => void;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = projects.find((project) => project.id === editingId) ?? null;

  const update = (patch: Partial<ProjectProfile>) => {
    if (!editing) return;
    onSave(
      projects.map((project) =>
        project.id === editing.id ? { ...project, ...patch, updatedAt: Date.now() } : project,
      ),
    );
  };

  const create = (base?: ProjectProfile) => {
    const project = base ? duplicateProject(base) : emptyProject();
    onSave([...projects, project]);
    setEditingId(project.id);
  };

  const remove = (project: ProjectProfile) => {
    if (projects.length === 1) return;
    const remaining = projects.filter((entry) => entry.id !== project.id);
    onSave(remaining);
    if (activeId === project.id) onSelect(remaining[0].id);
    if (defaultId === project.id) onSetDefault(remaining[0].id);
    if (editingId === project.id) setEditingId(null);
  };

  return (
    <Modal
      wide
      title={editing ? `Edit “${editing.name}”` : "Project profiles"}
      description={
        editing
          ? "These rules are written into every prompt generated for this project."
          : "Persistent design rules per project — defined once, carried into every prompt."
      }
      onClose={onClose}
    >
      {editing ? (
        <>
          <div className="max-h-[70vh] overflow-y-auto">
            <ProjectEditor project={editing} onChange={update} />
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-fpb-line px-5 py-3">
            <div className="flex gap-2">
              <Button onClick={() => setEditingId(null)}>Back to all projects</Button>
              <Button onClick={() => onViewGuidelines(editing.id)}>
                <BookOpen aria-hidden className="h-3.5 w-3.5" />
                Figma Guidelines
              </Button>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                onSelect(editing.id);
                onClose();
              }}
            >
              Use this project
            </Button>
          </footer>
        </>
      ) : (
        <>
          <div className="max-h-[65vh] overflow-y-auto p-3">
            <ul className="flex flex-col gap-1.5">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex flex-wrap items-center gap-2 rounded border border-fpb-line px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[13px] font-medium text-fpb-ink">
                      {project.name}
                      {project.id === defaultId ? (
                        <span className="rounded border border-fpb-line-strong px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.05em] text-fpb-faint">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-fpb-faint">
                      {project.productDescription || "No product description yet"}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-fpb-muted">
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 rounded-full ${project.guidelinesInstalled ? "bg-fpb-positive" : "bg-fpb-faint"}`}
                      />
                      {project.guidelinesInstalled ? "Guidelines active" : "Guidelines not installed"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" onClick={() => onViewGuidelines(project.id)}>
                      <BookOpen aria-hidden className="h-3.5 w-3.5" />
                      Figma Guidelines
                    </Button>
                    <Button size="sm" onClick={() => setEditingId(project.id)}>
                      <Pencil aria-hidden className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button size="sm" aria-label={`Duplicate ${project.name}`} onClick={() => create(project)}>
                      <Copy aria-hidden className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      aria-label={`Set ${project.name} as default`}
                      title="Set as default"
                      disabled={project.id === defaultId}
                      onClick={() => onSetDefault(project.id)}
                    >
                      <Check aria-hidden className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      aria-label={`Delete ${project.name}`}
                      disabled={projects.length === 1}
                      onClick={() => remove(project)}
                    >
                      <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant={project.id === activeId ? "ghost" : "primary"}
                      disabled={project.id === activeId}
                      onClick={() => {
                        onSelect(project.id);
                        onClose();
                      }}
                    >
                      {project.id === activeId ? "In use" : "Use"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <footer className="flex flex-wrap items-center gap-2 border-t border-fpb-line px-5 py-3">
            <Button onClick={() => create()}>
              <Plus aria-hidden className="h-3.5 w-3.5" />
              New project
            </Button>
            {projects.some((project) => project.id === sampleProject().id) ? null : (
              <Button
                onClick={() => {
                  const sample = sampleProject();
                  onSave([...projects, sample]);
                  setEditingId(sample.id);
                }}
              >
                Restore sample project
              </Button>
            )}
          </footer>
        </>
      )}
    </Modal>
  );
}

function ProjectEditor({
  project,
  onChange,
}: {
  project: ProjectProfile;
  onChange: (patch: Partial<ProjectProfile>) => void;
}) {
  return (
    <div className="divide-y divide-fpb-line">
      <Collapsible title="Product" defaultOpen>
        <TextInput label="Project name" value={project.name} onChange={(name) => onChange({ name })} />
        <TextArea
          label="Product description"
          hint="What the product is and what it does. One short paragraph."
          value={project.productDescription}
          onChange={(productDescription) => onChange({ productDescription })}
        />
        <TextArea
          label="Primary users"
          value={project.primaryUsers}
          onChange={(primaryUsers) => onChange({ primaryUsers })}
          rows={2}
        />
        <TextArea
          label="Brand / experience direction"
          hint="How it should feel, in concrete terms."
          value={project.brandDirection}
          onChange={(brandDirection) => onChange({ brandDirection })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title="Typography & color" defaultOpen>
        <TextInput
          label="Heading typeface"
          value={project.headingTypeface}
          onChange={(headingTypeface) => onChange({ headingTypeface })}
          placeholder="Typeface, weight and size scale"
        />
        <TextInput
          label="Body / UI typeface"
          value={project.bodyTypeface}
          onChange={(bodyTypeface) => onChange({ bodyTypeface })}
          placeholder="Typeface, weights and body size"
        />
        <ColorTokenBuilder colors={project.colors} onChange={(colors) => onChange({ colors })} />
      </Collapsible>

      <Collapsible title="Layout & spacing">
        <TextInput
          label="Spacing scale"
          value={project.spacingScale}
          onChange={(spacingScale) => onChange({ spacingScale })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Grid columns"
            value={project.grid.columns}
            onChange={(columns) => onChange({ grid: { ...project.grid, columns } })}
          />
          <TextInput
            label="Content max width"
            value={project.grid.maxWidth}
            onChange={(maxWidth) => onChange({ grid: { ...project.grid, maxWidth } })}
          />
          <TextInput
            label="Gutters"
            value={project.grid.gutters}
            onChange={(gutters) => onChange({ grid: { ...project.grid, gutters } })}
          />
          <TextInput
            label="Outer margins"
            value={project.grid.margins}
            onChange={(margins) => onChange({ grid: { ...project.grid, margins } })}
          />
        </div>
        <TextInput
          label="Responsive breakpoints"
          value={project.breakpoints}
          onChange={(breakpoints) => onChange({ breakpoints })}
        />
      </Collapsible>

      <Collapsible title="Components & surfaces">
        <TextArea label="Radius rules" value={project.radius} onChange={(radius) => onChange({ radius })} rows={2} />
        <TextArea label="Border rules" value={project.borders} onChange={(borders) => onChange({ borders })} rows={2} />
        <TextArea
          label="Shadow philosophy"
          value={project.shadows}
          onChange={(shadows) => onChange({ shadows })}
          rows={2}
        />
        <TextArea label="Icon direction" value={project.icons} onChange={(icons) => onChange({ icons })} rows={2} />
        <TextArea
          label="Button / action direction"
          value={project.buttons}
          onChange={(buttons) => onChange({ buttons })}
          rows={2}
        />
        <TextArea
          label="Image / illustration direction"
          value={project.imagery}
          onChange={(imagery) => onChange({ imagery })}
          rows={2}
        />
      </Collapsible>

      <Collapsible title="Standing rules">
        <TextArea
          label="Accessibility rules"
          hint="One per line. Added to the baseline rules every prompt already carries."
          value={project.accessibility}
          onChange={(accessibility) => onChange({ accessibility })}
        />
        <TextArea
          label="Permanent design rules"
          hint="One per line. Always true for this product."
          value={project.permanentRules}
          onChange={(permanentRules) => onChange({ permanentRules })}
          rows={4}
        />
        <TextArea
          label="Permanent “do not” rules"
          hint="One per line. Always forbidden in this product."
          value={project.doNotRules}
          onChange={(doNotRules) => onChange({ doNotRules })}
          rows={4}
        />
      </Collapsible>
    </div>
  );
}
