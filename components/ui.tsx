"use client";

/**
 * Small, unstyled-by-default primitives for the prompt builder.
 *
 * Deliberately hand-rolled rather than pulled from a component library:
 * the whole surface is about a dozen controls, and keeping them here
 * means one place to hold the line on focus states, target sizes and
 * label association.
 */

import { ChevronDown, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

/* ------------------------------------------------------------------ */
/* button                                                              */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-fpb-accent text-white hover:bg-fpb-accent-hover border-transparent",
  secondary: "bg-fpb-panel text-fpb-ink border-fpb-line-strong hover:bg-fpb-inset",
  ghost: "bg-transparent text-fpb-muted border-transparent hover:bg-fpb-inset hover:text-fpb-ink",
  danger: "bg-fpb-panel text-fpb-danger border-fpb-line-strong hover:bg-fpb-inset",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  const sizing = size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3 text-[13px]";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${sizing} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ */
/* field wrapper                                                       */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  hintId,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  hintId?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[12px] font-medium tracking-[0.01em] text-fpb-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="-mt-1 text-[12px] leading-[1.45] text-fpb-faint">
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  );
}

const CONTROL_CLASS =
  "w-full rounded border border-fpb-line-strong bg-fpb-panel px-2.5 py-2 text-[13px] leading-[1.45] text-fpb-ink placeholder:text-fpb-faint transition-colors hover:border-fpb-faint";

export function TextInput({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <Field label={label} hint={hint} hintId={hintId} htmlFor={id}>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${CONTROL_CLASS} h-9 py-0`}
      />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
  ...rest
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "rows" | "placeholder">) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <Field label={label} hint={hint} hintId={hintId} htmlFor={id}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        placeholder={placeholder}
        aria-describedby={hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={`${CONTROL_CLASS} resize-y`}
        {...rest}
      />
    </Field>
  );
}

export function Select({
  label,
  hint,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <Field label={label} hint={hint} hintId={hintId} htmlFor={id}>
      <div className="relative">
        <select
          id={id}
          value={value}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`${CONTROL_CLASS} h-9 appearance-none py-0 pr-8`}
        >
          <option value="">{placeholder ?? "Not set"}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fpb-faint"
        />
      </div>
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* choices                                                             */
/* ------------------------------------------------------------------ */

export function ChipGroup({
  label,
  hint,
  options,
  selected,
  onToggle,
}: {
  label: string;
  hint?: string;
  options: readonly string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-[12px] font-medium text-fpb-ink">{label}</legend>
      {hint ? <p className="text-[12px] leading-[1.45] text-fpb-faint">{hint}</p> : null}
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <label
              key={option}
              className={`cursor-pointer select-none rounded border px-2.5 py-1.5 text-[12.5px] leading-none transition-colors ${
                active
                  ? "border-fpb-accent bg-fpb-accent-soft text-fpb-accent"
                  : "border-fpb-line-strong bg-fpb-panel text-fpb-muted hover:border-fpb-faint hover:text-fpb-ink"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={active}
                onChange={() => onToggle(option)}
              />
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string; hint?: string }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex max-w-full overflow-x-auto rounded border border-fpb-line-strong bg-fpb-inset p-0.5 ${className}`}
    >
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => onChange(option.id)}
            className={`h-7 shrink-0 whitespace-nowrap rounded-[3px] px-2.5 text-[12.5px] font-medium transition-colors ${
              active ? "bg-fpb-panel text-fpb-ink shadow-[0_1px_2px_rgba(20,20,25,0.08)]" : "text-fpb-muted hover:text-fpb-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-fpb-ink">{label}</p>
        {hint ? <p className="mt-0.5 text-[12px] leading-[1.45] text-fpb-faint">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${
          checked ? "border-fpb-accent bg-fpb-accent" : "border-fpb-line-strong bg-fpb-inset"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-[left] ${checked ? "left-[18px]" : "left-0.5"}`}
          style={checked ? undefined : { boxShadow: "0 1px 2px rgba(20,20,25,0.25)" }}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* collapsible group                                                   */
/* ------------------------------------------------------------------ */

export function Collapsible({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <section className="border-b border-fpb-line last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-fpb-inset md:px-5"
        >
          <ChevronDown
            aria-hidden
            className={`h-3.5 w-3.5 shrink-0 text-fpb-faint transition-transform ${open ? "" : "-rotate-90"}`}
          />
          <span className="text-[13px] font-semibold tracking-[-0.005em] text-fpb-ink">{title}</span>
          {summary && !open ? (
            <span className="ml-auto truncate pl-3 text-[12px] text-fpb-faint">{summary}</span>
          ) : null}
        </button>
      </h3>
      <div id={id} hidden={!open} className="flex flex-col gap-4 px-4 pb-5 pt-1 md:px-5">
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* modal                                                               */
/* ------------------------------------------------------------------ */

export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("button, input, select, textarea")?.focus();
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previous?.focus?.();
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(23,23,26,0.32)] p-3 md:p-8">
      <div aria-hidden onClick={onClose} className="absolute inset-0 h-full w-full cursor-default" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 my-auto w-full rounded-lg border border-fpb-line bg-fpb-panel shadow-[0_12px_40px_rgba(20,20,25,0.18)] ${
          wide ? "max-w-4xl" : "max-w-2xl"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-fpb-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-[15px] font-semibold tracking-[-0.01em] text-fpb-ink">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-[12.5px] text-fpb-muted">{description}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X aria-hidden className="h-4 w-4" />
          </Button>
        </header>
        {children}
      </div>
    </div>
  );
}
