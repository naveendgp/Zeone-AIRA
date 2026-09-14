import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Fetch a public web page's text for enrichment — and nothing that isn't public.
 *
 * The URL arrives from the browser, so without this the server would happily fetch
 * http://127.0.0.1, a cloud metadata address, or anything on a private network on the
 * caller's behalf. Every hop, including each redirect, is resolved and checked.
 *
 * (A DNS answer can change between our lookup and fetch's own. That gap is acceptable for
 * reading a clinic's homepage; it would not be for anything carrying credentials.)
 */
function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 || a >= 224 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

function privateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return privateV4(ip);
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]);
  return v6 === "::1" || v6 === "::" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
}

async function publicHost(hostname: string): Promise<boolean> {
  if (!hostname || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return false;
  }
  if (net.isIP(hostname)) return !privateIp(hostname);
  try {
    const addrs = await lookup(hostname, { all: true });
    return addrs.length > 0 && addrs.every((a) => !privateIp(a.address));
  } catch {
    return false;
  }
}

export async function safeFetchHtml(
  input: string,
  { maxBytes = 1_500_000, timeoutMs = 8000, maxRedirects = 3 } = {}
): Promise<{ url: string; html: string } | null> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!(await publicHost(url.hostname))) return null;

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { "User-Agent": "FrontlineBot/1.0 (+setup assistant)", Accept: "text/html" },
      });
    } catch {
      return null;
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      url = new URL(loc, url);
      continue;
    }
    if (!res.ok || !res.body) return null;
    if (!/text\/(html|plain)/i.test(res.headers.get("content-type") ?? "")) return null;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return { url: url.toString(), html: new TextDecoder().decode(Buffer.concat(chunks)) };
  }
  return null;
}

/** Visible text only — scripts, styles and markup gone, block ends turned into line breaks. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|h[1-6]|div|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8377;|&#x20b9;/gi, "₹")
    .replace(/&rsquo;|&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;|&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

/** Same-site links that probably list services, prices or people. */
export function interestingLinks(html: string, base: string, limit = 3): string[] {
  const origin = new URL(base).origin;
  const seen = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    let u: URL;
    try {
      u = new URL(m[1], base);
    } catch {
      continue;
    }
    if (u.origin !== origin) continue;
    if (!/(service|treatment|price|pricing|rate|tariff|menu|fee|package|about|doctor|team|staff|faq)/i.test(u.pathname)) continue;
    seen.add(u.toString());
    if (seen.size >= limit) break;
  }
  return [...seen];
}
