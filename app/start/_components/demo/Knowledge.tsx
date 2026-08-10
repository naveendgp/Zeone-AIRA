"use client";

import { DAYS, type Draft, type PolicyKey } from "../../_lib/schema";
import { PRESETS, POLICY_META, questionsFor, typeLabel } from "../../_lib/presets";
import { cn } from "../ui";

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="py-4">
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-ghost">
        {title}
        <span className="rounded-full bg-paper-tint px-1.5 py-0.5 text-[10px] tabular-nums text-ink-faint">{count}</span>
      </h3>
      {children}
    </section>
  );
}

const Line = ({ k, v, muted }: { k: string; v: string; muted?: boolean }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <span className="text-[13px] text-ink-dim">{k}</span>
    <span className={cn("shrink-0 text-[12.5px] tabular-nums", muted ? "text-ink-ghost" : "text-ink-dim")}>{v}</span>
  </div>
);

export function Knowledge({ draft, who }: { draft: Draft; who: string }) {
  const preset = draft.type ? PRESETS[draft.type] : PRESETS.clinic;
  const services = (draft.services ?? []).filter((s) => s.name?.trim());
  const staff = (draft.staff ?? []).filter((s) => s.name?.trim());
  const faqs = (draft.faqs ?? []).filter((f) => f.q?.trim() && f.a?.trim());
  const onPolicies = (Object.keys(draft.policies ?? {}) as PolicyKey[]).filter((k) => draft.policies[k]?.on);
  const openDays = DAYS.filter((d) => !draft.hours?.[d]?.closed);
  const profileAnswers: [string, string][] = questionsFor(draft)
    .filter((q) => draft.profile?.[q.id]?.trim())
    .map((q) => [q.ask, draft.profile![q.id].trim()]);

  return (
    <div className="h-[540px] overflow-y-auto px-1">
      <p className="pt-1 text-[12.5px] leading-relaxed text-ink-faint">
        This is everything {who} can talk about. Nothing else. If a caller asks for something that
        isn&apos;t on this page, {who} says so instead of guessing.
      </p>

      <div className="divide-y divide-line">
        <Section title="Business" count={1}>
          <Line k="Name" v={draft.name || "—"} />
          <Line k="Type" v={typeLabel(draft.type, draft.otherType)} />
          {draft.phone?.trim() && <Line k="Phone" v={draft.phone} />}
          {draft.address?.trim() && <Line k="Address" v={draft.address} />}
          {draft.website?.trim() && <Line k="Website" v={draft.website} />}
        </Section>

        <Section title="Working hours" count={openDays.length}>
          {DAYS.map((d) => {
            const h = draft.hours?.[d];
            return <Line key={d} k={d} v={h?.closed ? "Holiday" : `${h?.open} – ${h?.close}`} muted={h?.closed} />;
          })}
        </Section>

        {preset.staffNoun && (
          <Section title={preset.staffNoun + "s"} count={staff.length}>
            {staff.length ? (
              staff.map((s) => (
                <Line
                  key={s.id}
                  k={s.role ? `${s.name} · ${s.role}` : s.name}
                  v={[s.fee?.trim() && `₹${s.fee}`, s.hours?.trim()].filter(Boolean).join(" · ") || "—"}
                />
              ))
            ) : (
              <p className="text-[12.5px] text-ink-ghost">None added.</p>
            )}
          </Section>
        )}

        <Section title={preset.serviceNoun + "s"} count={services.length}>
          {services.map((s) => (
            <Line key={s.id} k={s.name} v={s.price?.trim() ? `₹${s.price}` : "price not set"} muted={!s.price?.trim()} />
          ))}
        </Section>

        <Section title="Policies" count={onPolicies.length}>
          {onPolicies.length ? (
            onPolicies.map((k) => (
              <Line key={k} k={POLICY_META[k].label} v={draft.policies[k].note?.trim() || "Yes"} />
            ))
          ) : (
            <p className="text-[12.5px] text-ink-ghost">
              None turned on — {who} will say you don&apos;t offer these.
            </p>
          )}
        </Section>

        <Section title="About the business" count={profileAnswers.length}>
          {profileAnswers.length ? (
            profileAnswers.map(([q, a]) => <Line key={q} k={q} v={a} />)
          ) : (
            <p className="text-[12.5px] text-ink-ghost">None answered.</p>
          )}
        </Section>

        <Section title="FAQs" count={faqs.length}>
          {faqs.length ? (
            <div className="space-y-3">
              {faqs.map((f) => (
                <div key={f.id} className="rounded-xl border border-line bg-white p-3">
                  <p className="text-[12.5px] font-medium text-ink-soft">{f.q}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-faint">{f.a}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-ghost">None added.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
