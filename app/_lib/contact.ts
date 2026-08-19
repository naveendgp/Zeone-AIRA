/**
 * Where "talk to us" actually goes.
 *
 * Set NEXT_PUBLIC_WHATSAPP to your number in international form without symbols
 * (e.g. 919840000000). Until it is set, every contact button falls back to /pricing
 * rather than rendering a link that does nothing — the site already shipped three dead
 * buttons and they cost real intent.
 */
const RAW = (process.env.NEXT_PUBLIC_WHATSAPP ?? "").replace(/\D/g, "");

export const HAS_WHATSAPP = RAW.length >= 10;

export const WHATSAPP = HAS_WHATSAPP
  ? `https://wa.me/${RAW}?text=${encodeURIComponent("Hi, I saw Frontline and want to know more.")}`
  : "/pricing";
