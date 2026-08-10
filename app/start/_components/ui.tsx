"use client";

import { clsx, type ClassValue } from "clsx";
import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import { Check } from "lucide-react";
import * as React from "react";

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

/* --------------------------------- button -------------------------------- */
const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 " +
    "focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-40 active:scale-[.98]",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white shadow-[0_10px_20px_#6d4ed82e] hover:bg-brand-hover",
        ghost: "text-ink-faint hover:bg-black/[0.04] hover:text-ink",
        outline: "border border-line bg-white text-ink-soft hover:border-line-strong hover:bg-paper-soft",
        dark: "bg-night text-white hover:bg-night-soft",
        danger: "text-ink-ghost hover:bg-rose-50 hover:text-rose-600",
      },
      size: {
        sm: "h-9 px-3.5 text-[12.5px]",
        md: "h-11 px-5 text-[13.5px]",
        lg: "h-[52px] px-7 text-[14.5px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(button({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

/* ---------------------------------- card --------------------------------- */
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-line bg-white shadow-[0_20px_45px_#2924380d]", className)}
      {...p}
    />
  );
}

/* --------------------------------- inputs -------------------------------- */
const fieldBase =
  "w-full rounded-xl border border-line bg-white text-ink placeholder:text-ink-ghost/70 " +
  "transition-all outline-none hover:border-line-strong " +
  "focus:border-brand/60 focus:ring-4 focus:ring-brand/10";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-[58px] px-5 text-[16.5px]", className)} {...p} />
  )
);
Input.displayName = "Input";

export const InputSm = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => (
    <input ref={ref} className={cn(fieldBase, "h-12 px-4 text-[14px]", className)} {...p} />
  )
);
InputSm.displayName = "InputSm";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => (
    <textarea ref={ref} className={cn(fieldBase, "min-h-[92px] resize-none px-4 py-3 text-[14px] leading-relaxed", className)} {...p} />
  )
);
Textarea.displayName = "Textarea";

export function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="mb-2 flex items-baseline gap-2">
      <span className="text-[11.5px] font-bold tracking-tight text-ink-dim">{children}</span>
      {optional && <span className="text-[10.5px] text-ink-ghost">optional</span>}
    </span>
  );
}

/* --------------------------------- switch -------------------------------- */
export function Switch({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        checked ? "bg-brand" : "bg-line-strong"
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300",
          checked ? "left-[23px]" : "left-[3px]"
        )}
      />
    </button>
  );
}

/* ------------------------------ choice tiles ------------------------------ */
export function Choice({
  selected, onClick, icon: Icon, title, blurb,
}: {
  selected: boolean; onClick: () => void;
  icon: React.ComponentType<{ className?: string }>; title: string; blurb: string;
}) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={selected}
      className={cn(
        "group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        selected
          ? "border-brand/45 bg-brand-soft shadow-[0_10px_26px_#6d4ed81f]"
          : "border-line bg-white hover:border-line-strong hover:shadow-[0_10px_24px_#2924380a]"
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
          selected ? "bg-brand text-white" : "bg-paper-tint text-ink-faint group-hover:text-brand"
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold tracking-tight text-ink">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-faint">{blurb}</span>
      </span>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all",
          selected ? "border-brand bg-brand text-white" : "border-line-strong"
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3.5} />}
      </span>
    </button>
  );
}

export function Toggle({
  selected, onClick, icon: Icon, label,
}: {
  selected: boolean; onClick: () => void;
  icon: React.ComponentType<{ className?: string }>; label: string;
}) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={selected}
      className={cn(
        "flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
        selected
          ? "border-brand/45 bg-brand text-white shadow-[0_8px_18px_#6d4ed82e]"
          : "border-line bg-white text-ink-dim hover:border-line-strong hover:text-ink"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/* --------------------------------- misc ---------------------------------- */
export function Pill({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-soft px-2.5 py-1 text-[11.5px] text-ink-dim",
        className
      )}
      {...p}
    />
  );
}

/** Question heading. `accent` renders in Playfair italic, matching the landing page. */
export function Ask({
  title, accent, hint,
}: { title: React.ReactNode; accent?: string; hint?: React.ReactNode }) {
  return (
    <header className="mb-9">
      <h1 className="text-[32px] font-extrabold leading-[1.08] tracking-[-0.028em] text-ink sm:text-[42px]">
        {title}
        {accent && <em className="font-display font-semibold not-italic italic text-brand-hover"> {accent}</em>}
      </h1>
      {hint && <p className="mt-4 text-[15px] leading-relaxed text-ink-dim">{hint}</p>}
    </header>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.135em] text-brand-label">
      {children}
    </span>
  );
}

export function EnterHint() {
  return (
    <span className="hidden items-center gap-1.5 text-[11px] text-ink-ghost sm:inline-flex">
      press
      <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
        Enter ↵
      </kbd>
    </span>
  );
}
