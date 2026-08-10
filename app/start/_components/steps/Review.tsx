"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { DAYS, type Draft, type PolicyKey } from "../../_lib/schema";
import { PRESETS, POLICY_META, questionsFor, assistantNameFor, typeLabel } from "../../_lib/presets";
import { coverage, knowledgeCount } from "../../_lib/engine";
import { Ask, Pill, cn } from "../ui";

function Row({ label, value, onEdit }: { label: string; value: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="group flex items-start gap-4 py-3.5">
      <span className="w-[92px] shrink-0 pt-0.5 text-[12px] text-ink-ghost">{label}</span>
      <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink-soft">{value}</span>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${label}`}
          className="shrink-0 rounded-lg p-1.5 text-ink-ghost opacity-0 transition-all hover:bg-black/[0.04] hover:text-ink group-hover:opacity-100"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function Review({ onJump }: { onJump: (key: string) => void }) {
  const { control } = useFormContext<Draft>();
  const draft = useWatch({ control }) as Draft;
  const preset = draft.type ? PRESETS[draft.type] : PRESETS.clinic;
  const who = assistantNameFor(draft.type, draft.name || "Zeone");

  const services = (draft.services ?? []).filter((s) => s.name?.trim());
  const staff = (draft.staff ?? []).filter((s) => s.name?.trim());
  const faqs = (draft.faqs ?? []).filter((f) => f.q?.trim() && f.a?.trim());
  const onPolicies = (Object.keys(draft.policies ?? {}) as PolicyKey[]).filter((k) => draft.policies[k]?.on);
  const openDays = DAYS.filter((d) => !draft.hours?.[d]?.closed);
  const closedDays = DAYS.filter((d) => draft.hours?.[d]?.closed);

  const cov = coverage(draft);
  const facts = knowledgeCount(draft);

  return (
    <>
      <Ask title={`This is what ${who} will know.`} hint="Change anything now — or later, any time." />

      <div className="mb-7 flex gap-3">
        {[
          { v: String(facts), l: "facts learned" },
          { v: `${cov}%`, l: "call coverage" },
        ].map((s, i) => (
          <div key={s.l} className="flex-1 rounded-2xl border border-line bg-white p-4">
            <div className="text-[28px] font-semibold tabular-nums leading-none tracking-tight text-ink">{s.v}</div>
            <div className="mt-1.5 text-[12px] text-ink-ghost">{s.l}</div>
            {i === 1 && (
              <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-paper-tint">
                <motion.div
                  className={cn("h-full rounded-full", cov >= 70 ? "bg-leaf-bright" : cov >= 40 ? "bg-amber-400" : "bg-rose-400")}
                  initial={{ width: 0 }}
                  animate={{ width: `${cov}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="divide-y divide-line">
        <Row
          label="Business"
          onEdit={() => onJump("name")}
          value={
            <>
              <span className="font-medium text-ink">{draft.name || "—"}</span>
              <span className="text-ink-ghost"> · {typeLabel(draft.type, draft.otherType)}</span>
              {draft.address?.trim() && <div className="mt-0.5 text-[13px] text-ink-faint">{draft.address}</div>}
            </>
          }
        />
        <Row
          label="Hours"
          onEdit={() => onJump("hours")}
          value={
            openDays.length
              ? `Open ${openDays.length} days${closedDays.length ? ` · closed ${closedDays.join(", ")}` : ""}`
              : "No open days set"
          }
        />
        {preset.staffNoun && (
          <Row
            label={preset.staffNoun + "s"}
            onEdit={() => onJump("staff")}
            value={
              staff.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {staff.map((s) => <Pill key={s.id}>{s.role ? `${s.name} · ${s.role}` : s.name}</Pill>)}
                </div>
              ) : <span className="text-ink-ghost">None added</span>
            }
          />
        )}
        <Row
          label={preset.serviceNoun + "s"}
          onEdit={() => onJump("services")}
          value={
            <div className="flex flex-wrap gap-1.5">
              {services.map((s) => (
                <Pill key={s.id}>
                  {s.name}
                  {s.price?.trim() && <span className="tabular-nums text-ink-ghost">₹{s.price}</span>}
                </Pill>
              ))}
            </div>
          }
        />
        <Row
          label="Policies"
          onEdit={() => onJump("policies")}
          value={
            onPolicies.length ? (
              <div className="flex flex-wrap gap-1.5">
                {onPolicies.map((k) => (
                  <Pill key={k} className="border-leaf-line bg-leaf-soft text-leaf">
                    {POLICY_META[k].label}
                  </Pill>
                ))}
              </div>
            ) : <span className="text-ink-ghost">None</span>
          }
        />
        <Row
          label="Questions"
          onEdit={() => onJump("faqs")}
          value={(() => {
            const qs = questionsFor(draft);
            const done = qs.filter((q) => draft.profile?.[q.id]?.trim()).length;
            const parts = [
              done ? `${done} of ${qs.length} common ones answered` : "",
              faqs.length ? `${faqs.length} of your own` : "",
            ].filter(Boolean);
            return parts.length ? parts.join(" · ") : <span className="text-ink-ghost">None answered</span>;
          })()}
        />
      </div>

      {cov < 60 && (
        <p className="mt-6 text-[13px] leading-relaxed text-amber-700">
          You can generate now, but with this little detail {who} will say &ldquo;I don&apos;t have that
          information&rdquo; fairly often. Prices and a couple of FAQs make the biggest difference.
        </p>
      )}
    </>
  );
}
