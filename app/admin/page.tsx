import { readEvents, analyticsEnabled, type ZeoneEvent } from "../_lib/analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Zeone — testing dashboard" };

/* ------------------------------ shaping ---------------------------------- */

const STEP_ORDER = ["welcome", "name", "type", "contact", "hours", "staff", "services", "policies", "faqs", "review"];

interface Session {
  sid: string;
  first: number;
  last: number;
  city?: string;
  ua?: string;
  steps: Set<string>;
  deepest: string;
  finished: boolean;
  draft?: Record<string, unknown>;
  asks: ZeoneEvent[];
}

function shape(events: ZeoneEvent[]) {
  const sessions = new Map<string, Session>();
  const errors: ZeoneEvent[] = [];

  // Oldest first, so "deepest step" and "last seen" build up naturally.
  for (const e of [...events].reverse()) {
    if (e.type === "error") { errors.push(e); continue; }
    if (e.sid === "server") continue; // server-side voice events aren't tied to a visitor

    let s = sessions.get(e.sid);
    if (!s) {
      s = { sid: e.sid, first: e.t, last: e.t, steps: new Set(), deepest: "welcome",
            finished: false, asks: [] };
      sessions.set(e.sid, s);
    }
    s.last = Math.max(s.last, e.t);
    if (e.city) s.city = String(e.city);
    if (e.ua) s.ua = String(e.ua);

    if (e.type === "step") {
      const key = String((e.data as { key?: string })?.key ?? "");
      if (key) {
        s.steps.add(key);
        if (STEP_ORDER.indexOf(key) > STEP_ORDER.indexOf(s.deepest)) s.deepest = key;
      }
    } else if (e.type === "generated") {
      s.finished = true;
      s.draft = (e.data as { draft?: Record<string, unknown> })?.draft;
    } else if (e.type === "ask") {
      s.asks.push(e);
    }
  }

  const list = [...sessions.values()].sort((a, b) => b.last - a.last);
  const asks = list.flatMap((s) => s.asks);
  const badge = (c: string) => asks.filter((a) => a.confidence === c).length;

  // The funnel counts how many sessions got at least as far as each step.
  const funnel = STEP_ORDER.map((key) => ({
    key,
    n: list.filter((s) => STEP_ORDER.indexOf(s.deepest) >= STEP_ORDER.indexOf(key)).length,
  }));

  return {
    sessions: list,
    errors: errors.slice(0, 40),
    asks,
    totals: {
      sessions: list.length,
      finished: list.filter((s) => s.finished).length,
      asks: asks.length,
      green: badge("grounded"), amber: badge("general"), red: badge("unknown"),
    },
    funnel,
  };
}

const when = (t: number) =>
  new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/* -------------------------------- view ------------------------------------ */

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className={`text-[28px] font-semibold tabular-nums leading-none tracking-tight ${tone ?? "text-ink"}`}>
        {value}
      </div>
      <div className="mt-1.5 text-[12px] text-ink-ghost">{label}</div>
    </div>
  );
}

/** Mirrors factsheet.ts's Confidence union — the badge the verifier assigned, not the model's. */
const BADGE: Record<string, { dot: string; label: string }> = {
  grounded: { dot: "bg-leaf-bright", label: "from their words" },
  general:  { dot: "bg-amber-400",   label: "general" },
  unknown:  { dot: "bg-rose-400",    label: "not known" },
};

export default async function AdminPage() {
  if (!analyticsEnabled) {
    return (
      <main className="mx-auto max-w-[560px] px-6 py-24">
        <h1 className="text-[24px] font-bold tracking-tight text-ink">Nothing is being recorded yet</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-dim">
          Add an Upstash Redis integration in Vercel (Storage → Marketplace). It sets
          <code className="mx-1 rounded bg-paper-tint px-1.5 py-0.5 text-[12.5px]">UPSTASH_REDIS_REST_URL</code>
          and
          <code className="mx-1 rounded bg-paper-tint px-1.5 py-0.5 text-[12.5px]">UPSTASH_REDIS_REST_TOKEN</code>
          automatically. Redeploy and this page fills in.
        </p>
      </main>
    );
  }

  const { sessions, errors, asks, totals, funnel } = shape(await readEvents());

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-12">
      <header className="mb-8">
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Who&apos;s been testing</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-dim">
          Newest first · last {sessions.length} sessions kept
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="people opened it" value={totals.sessions} />
        <Stat label="finished setup" value={totals.finished} />
        <Stat label="questions asked" value={totals.asks} />
        <Stat
          label="answered from their own words"
          value={totals.asks ? `${Math.round((totals.green / totals.asks) * 100)}%` : "—"}
          tone="text-leaf"
        />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-[1fr_1fr]">
        {/* Where people give up */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-ink-ghost">How far they got</h2>
          <div className="space-y-1.5">
            {funnel.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <span className="w-[68px] shrink-0 text-[12.5px] text-ink-soft">{f.key}</span>
                <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-paper-tint">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: totals.sessions ? `${(f.n / totals.sessions) * 100}%` : "0%" }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[12px] tabular-nums text-ink-ghost">{f.n}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Answer quality */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-ink-ghost">Answer confidence</h2>
          {totals.asks === 0 ? (
            <p className="text-[13px] text-ink-ghost">No questions asked yet.</p>
          ) : (
            <div className="space-y-2.5">
              {([["grounded", totals.green], ["general", totals.amber], ["unknown", totals.red]] as const).map(
                ([k, n]) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${BADGE[k].dot}`} />
                    <span className="w-[86px] shrink-0 text-[12.5px] text-ink-soft">{BADGE[k].label}</span>
                    <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-paper-tint">
                      <div
                        className={`h-full rounded-full ${BADGE[k].dot}`}
                        style={{ width: `${(n / totals.asks) * 100}%` }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right text-[12px] tabular-nums text-ink-ghost">{n}</span>
                  </div>
                )
              )}
              <p className="pt-1 text-[11.5px] leading-relaxed text-ink-faint">
                Red isn&apos;t a bug — it&apos;s the assistant refusing to invent something the
                owner never told it.
              </p>
            </div>
          )}
        </section>
      </div>

      {errors.length > 0 && (
        <section className="mb-8 rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
          <h2 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-rose-700">
            Failures ({errors.length})
          </h2>
          <div className="space-y-1.5">
            {errors.slice(0, 8).map((e, i) => (
              <div key={i} className="flex gap-3 text-[12.5px]">
                <span className="w-[92px] shrink-0 tabular-nums text-rose-700/70">{when(e.t)}</span>
                <span className="w-[38px] shrink-0 font-semibold text-rose-700">{String(e.where ?? "?")}</span>
                <span className="min-w-0 flex-1 truncate text-rose-900/80">
                  {String(e.status ?? "")} {String(e.detail ?? "")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 className="mb-3 text-[11px] uppercase tracking-[0.14em] text-ink-ghost">Every session</h2>
      <div className="space-y-3">
        {sessions.length === 0 && (
          <p className="rounded-2xl border border-line bg-white p-6 text-[13.5px] text-ink-ghost">
            Nobody has opened the link yet.
          </p>
        )}

        {sessions.map((s) => {
          const d = s.draft as
            | { name?: string; type?: string; otherType?: string; phone?: string; address?: string;
                services?: { name?: string; price?: string }[]; staff?: { name?: string; role?: string }[];
                profile?: Record<string, string>; faqs?: { q?: string; a?: string }[] }
            | undefined;
          return (
            <details key={s.sid} className="group rounded-2xl border border-line bg-white">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${s.finished ? "bg-leaf-bright" : "bg-ink-ghost/40"}`}
                  title={s.finished ? "finished setup" : `stopped at ${s.deepest}`}
                />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                  {d?.name || <span className="font-normal text-ink-ghost">(no name yet)</span>}
                  {d?.type && <span className="font-normal text-ink-ghost"> · {d.otherType || d.type}</span>}
                </span>
                <span className="hidden shrink-0 text-[12px] text-ink-ghost sm:inline">{s.city ?? ""}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-ink-ghost">
                  {s.asks.length ? `${s.asks.length} Q` : "—"}
                </span>
                <span className="shrink-0 text-[12px] tabular-nums text-ink-faint">{when(s.last)}</span>
              </summary>

              <div className="border-t border-line px-4 py-4 text-[13px]">
                <p className="mb-3 text-[12px] text-ink-ghost">
                  Stopped at <strong className="text-ink-soft">{s.deepest}</strong>
                  {" · "}{Math.max(1, Math.round((s.last - s.first) / 1000))}s on the page
                  {s.ua?.includes("Mobile") ? " · mobile" : ""}
                </p>

                {d && (
                  <div className="mb-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                    {d.phone && <div><span className="text-ink-ghost">Phone </span>{d.phone}</div>}
                    {d.address && <div><span className="text-ink-ghost">Address </span>{d.address}</div>}
                    {!!d.services?.length && (
                      <div className="sm:col-span-2">
                        <span className="text-ink-ghost">Services </span>
                        {d.services.filter((x) => x.name).map((x) => `${x.name}${x.price ? ` ₹${x.price}` : ""}`).join(", ")}
                      </div>
                    )}
                    {!!d.staff?.length && (
                      <div className="sm:col-span-2">
                        <span className="text-ink-ghost">Staff </span>
                        {d.staff.filter((x) => x.name).map((x) => `${x.name}${x.role ? ` (${x.role})` : ""}`).join(", ")}
                      </div>
                    )}
                    {!!d.faqs?.filter((f) => f.q).length && (
                      <div className="sm:col-span-2">
                        <span className="text-ink-ghost">Own questions </span>
                        {d.faqs.filter((f) => f.q).length}
                      </div>
                    )}
                  </div>
                )}

                {s.asks.length > 0 && (
                  <div className="space-y-2 border-t border-line pt-3">
                    {s.asks.map((a, i) => (
                      <div key={i} className="rounded-xl bg-paper-tint/60 p-3">
                        <div className="flex items-start gap-2">
                          <span className={`mt-[6px] h-2 w-2 shrink-0 rounded-full ${BADGE[String(a.confidence)]?.dot ?? "bg-ink-ghost"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-ink">{String(a.question)}</p>
                            <p className="mt-1 text-ink-soft">{String(a.answer)}</p>
                            <p className="mt-1.5 text-[11px] text-ink-faint">
                              {String(a.engine)}{a.model ? ` · ${a.model}` : ""}
                              {a.ms ? ` · ${a.ms}ms` : ""}
                              {a.note ? ` · ${a.note}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </main>
  );
}
