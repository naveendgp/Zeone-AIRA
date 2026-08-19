/**
 * Written text and spoken text are not the same thing.
 *
 * "₹150" and "ரூ.150" read fine on a screen, but a TTS engine says them as written — "roo
 * one fifty" — and nobody talks like that. In both Tamil and English the amount comes
 * first and the currency word follows: "150 ரூபாய்", "150 rupees".
 *
 * This is the web counterpart of tts_text.speakable() in the Python agent, which the phone
 * line has always run. The browser demo had no equivalent and shipped raw text to
 * ElevenLabs, so the same sentence sounded right on a call and wrong on the website.
 */

/**
 * ₹150 · ரூ.150 · ரூ 150 · Rs.150 · Rs 150 · INR 150 — with optional decimals.
 *
 * The digit group must END on a digit. A looser [\d,]+ also ate the comma in
 * "₹25,000, and we offer EMI", turning it into "25000 rupees and we offer EMI" — which
 * costs the sentence the pause a listener expects there.
 */
const AMOUNT = String.raw`\d+(?:,\d+)*(?:\.\d{1,2})?`;
const CURRENCY = new RegExp(String.raw`(?:₹|ரூ\.?|Rs\.?|INR)\s*(${AMOUNT})`, "gi");

/** "150 ரூ." / "150 Rs" — the currency already trails, so only the symbol needs replacing. */
const TRAILING = new RegExp(String.raw`(${AMOUNT})\s*(?:₹|ரூ\.?|Rs\.?|INR)(?![\w஀-௿])`, "gi");

const hasTamil = (s: string) => /[஀-௿]/.test(s);

/**
 * Amounts are spoken in the language of the sentence they sit in. A Tamil reply saying
 * "150 rupees" is as jarring as an English one saying "150 ரூபாய்".
 */
export function speakable(text: string): string {
  if (!text) return text;
  const word = hasTamil(text) ? "ரூபாய்" : "rupees";
  const amount = (n: string) => n.replace(/,/g, "");

  return text
    .replace(CURRENCY, (_m, n: string) => `${amount(n)} ${word}`)
    .replace(TRAILING, (_m, n: string) => `${amount(n)} ${word}`)
    // A stray "ரூ." with no number attached would still be read aloud as "roo".
    .replace(/ரூ\.(?=\s|$)/g, "ரூபாய்")
    .replace(/\s{2,}/g, " ")
    .trim();
}
