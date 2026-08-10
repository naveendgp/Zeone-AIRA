"use client";

import { useFormContext } from "react-hook-form";
import type { Draft } from "../../_lib/schema";
import { Ask, Input } from "../ui";

export function Name() {
  const { register, formState: { errors } } = useFormContext<Draft>();

  return (
    <>
      <Ask
        title={<>What&apos;s your business called?</>}
        hint="Your receptionist will greet callers with this name."
      />
      <Input
        {...register("name")}
        placeholder="Anand Dental Care"
        autoFocus
        autoComplete="organization"
        aria-label="Business name"
      />
      {errors.name && <p className="mt-3 text-[13px] text-rose-600">{errors.name.message}</p>}
    </>
  );
}
