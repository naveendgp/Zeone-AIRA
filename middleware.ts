import { NextResponse, type NextRequest } from "next/server";

/**
 * HTTP Basic auth on /admin.
 *
 * Deliberately the browser's own login prompt rather than a form: no session handling, no
 * cookie to leak, and it works before any React ships. Over HTTPS (which Vercel always
 * gives us) the header is inside TLS.
 *
 * With ADMIN_PASSWORD unset the dashboard returns 404 rather than opening — a missing env
 * var must never be the thing that publishes your testers' data.
 */
export const config = { matcher: ["/admin/:path*"] };

export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return new NextResponse("Not found", { status: 404 });

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
    const expectedUser = process.env.ADMIN_USER ?? "admin";
    if (user === expectedUser && pass === expected) return NextResponse.next();
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Zeone dashboard", charset="UTF-8"' },
  });
}
