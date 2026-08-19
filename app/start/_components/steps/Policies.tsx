"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import type { Draft, PolicyKey } from "../../_lib/schema";
import { PRESETS, POLICY_META } from "../../_lib/presets";
import { InputSm, Section, Toggle } from "../ui";

export function Policies() {
  const { control, register, setValue } = useFormContext<Draft>();
  const type = useWatch({ control, name: "type" });
  const policies = useWatch({ control, name: "policies" });
  const order = (type ? PRESETS[type].policyOrder : PRESETS.clinic.policyOrder) as PolicyKey[];
  const on = order.filter((k) => policies?.[k]?.on);

  return (
    <>
      <Section
        title="Which of these do you have?"
        hint="Tap the ones that apply. Anything you leave off, Zeone will politely tell callers you don't offer it."
      />

      <div className="flex flex-wrap gap-2.5">
        {order.map((key) => (
          <Toggle
            key={key}
            selected={!!policies?.[key]?.on}
            icon={POLICY_META[key].icon}
            label={POLICY_META[key].label}
            onClick={() => setValue(`policies.${key}.on`, !policies?.[key]?.on, { shouldDirty: true })}
          />
        ))}
      </div>

      <AnimatePresence initial={false}>
        {on.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="mb-3 mt-8 text-[12.5px] text-ink-ghost">
              Anything worth adding? Callers hear these word for word.
            </p>
            <div className="space-y-2">
              {on.map((key) => (
                <motion.div key={key} layout className="flex items-center gap-3">
                  <span className="w-[130px] shrink-0 text-[13px] text-ink-dim">{POLICY_META[key].label}</span>
                  <InputSm
                    {...register(`policies.${key}.note`)}
                    placeholder={POLICY_META[key].hint}
                    aria-label={`${POLICY_META[key].label} details`}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
