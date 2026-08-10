import { NextResponse, type NextRequest } from "next/server";

/**
 * HTTP Basic auth on /admin.
 *
 * The browser's own login prompt rather than a form: no session handling, no cookie to
 * leak, and it works before any React ships. Over HTTPS (which Vercel always gives us)
 * the header travels inside TLS.
 *
 * When ADMIN_PASSWORD is missing we still challenge and still reject everything — nothing
 * can authenticate against an unset password, so the data stays shut either way. An
 * earlier version returned 404 here, which was safe but undebuggable: a misconfigured
 * deploy looked exactly like a missing route. The x-zeone-auth header says which it is.
 */
export const config = { matcher: ["/admin/:path*"] };

function challenge(configured: boolean) {
  return new NextResponse(
    configured
      ? "Authentication required"
      : "ADMIN_PASSWORD is not set on this deployment, so nothing can sign in.",
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Zeone dashboard", charset="UTF-8"',
        // Config state only — never the value. Turns "why is it 404?" into one curl.
        "x-zeone-auth": configured ? "configured" : "unconfigured",
      },
    }
  );
}

export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return challenge(false);

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const i = decoded.indexOf(":");
    const user = i < 0 ? "" : decoded.slice(0, i);
    const pass = i < 0 ? "" : decoded.slice(i + 1);
    if (user === (process.env.ADMIN_USER ?? "admin") && pass === expected) {
      return NextResponse.next();
    }
  }

  return challenge(true);
}
