"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { Draft } from "../../_lib/schema";
import { Ask, Input, Label } from "../ui";

export function Contact() {
  const { register, control } = useFormContext<Draft>();
  const name = useWatch({ control, name: "name" });

  return (
    <>
      <Ask
        title="Where can people find you?"
        hint={`“Where are you?” is one of the most common questions ${name?.trim() || "a business"} gets. All optional.`}
      />
      <div className="space-y-5">
        <div>
          <Label optional>Address</Label>
          <Input {...register("address")} placeholder="21, Bazaar Road, Mylapore, Chennai" autoFocus autoComplete="street-address" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label optional>Phone</Label>
            <Input {...register("phone")} placeholder="+91 98400 00000" inputMode="tel" autoComplete="tel" />
          </div>
          <div>
            <Label optional>Website</Label>
            <Input {...register("website")} placeholder="anand.care" inputMode="url" />
          </div>
        </div>
      </div>
    </>
  );
}
