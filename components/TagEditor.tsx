"use client";

import { CATEGORIES, CATEGORY_LABEL, STYLES, type Category, type Style } from "@/lib/types";

export interface TagDraft {
  category: Category;
  name: string;
  style: Style;
  warmth: number;
  formality: number;
}

const WARMTH_HINT = ["Summer", "Light", "Mid", "Warm", "Winter"];
const FORMALITY_HINT = ["Lounge", "Casual", "Smart", "Sharp", "Black tie"];

function Stepper({
  label,
  value,
  hints,
  onChange,
}: {
  label: string;
  value: number;
  hints: string[];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-widest text-ink-2">{label}</span>
        <span className="text-xs text-ink">{hints[value - 1]}</span>
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} ${hints[n - 1]}`}
            aria-pressed={value === n}
            className={`h-11 flex-1 rounded-lg border text-xs transition-colors ${
              value === n
                ? "border-accent bg-accent-muted/30 text-accent"
                : "border-hairline bg-surface text-ink-2 hover:border-ink-2"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TagEditor({
  value,
  colors,
  onChange,
}: {
  value: TagDraft;
  colors: string[];
  onChange: (v: TagDraft) => void;
}) {
  const set = <K extends keyof TagDraft>(k: K, v: TagDraft[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-5">
      <div>
        <span className="mb-1.5 block text-[11px] uppercase tracking-widest text-ink-2">
          Category
        </span>
        <div className="flex gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set("category", c)}
              aria-pressed={value.category === c}
              className={`h-11 flex-1 rounded-lg border text-sm transition-colors ${
                value.category === c
                  ? "border-accent bg-accent-muted/30 text-accent"
                  : "border-hairline bg-surface text-ink-2 hover:border-ink-2"
              }`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="garment-name"
          className="mb-1.5 block text-[11px] uppercase tracking-widest text-ink-2"
        >
          Name
        </label>
        <input
          id="garment-name"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          maxLength={60}
          placeholder="black relaxed hoodie"
          className="h-11 w-full rounded-lg border border-hairline bg-surface px-3 text-sm text-ink placeholder:text-ink-2/60 focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <span className="mb-1.5 block text-[11px] uppercase tracking-widest text-ink-2">
          Colors — measured from the photo
        </span>
        <div className="flex items-center gap-2">
          {colors.length ? (
            colors.map((c) => (
              <span key={c} className="flex items-center gap-1.5">
                <span
                  className="h-6 w-6 rounded-md ring-1 ring-hairline"
                  style={{ background: c }}
                />
                <code className="text-[11px] text-ink-2">{c}</code>
              </span>
            ))
          ) : (
            <span className="text-xs text-ink-2">None detected</span>
          )}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-[11px] uppercase tracking-widest text-ink-2">
          Style
        </span>
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => set("style", s)}
              aria-pressed={value.style === s}
              className={`h-9 rounded-full border px-3 text-xs transition-colors ${
                value.style === s
                  ? "border-accent bg-accent-muted/30 text-accent"
                  : "border-hairline bg-surface text-ink-2 hover:border-ink-2"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <Stepper
        label="Warmth"
        value={value.warmth}
        hints={WARMTH_HINT}
        onChange={(v) => set("warmth", v)}
      />
      <Stepper
        label="Formality"
        value={value.formality}
        hints={FORMALITY_HINT}
        onChange={(v) => set("formality", v)}
      />
    </div>
  );
}
