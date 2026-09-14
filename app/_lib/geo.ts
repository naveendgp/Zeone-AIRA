/**
 * Visitor city for the dashboard, whichever platform we're behind.
 *
 * Vercel sends x-vercel-ip-city (URL-encoded); CloudFront — which Amplify sits on — sends
 * cloudfront-viewer-city when the distribution forwards it. Neither is guaranteed, so a
 * missing city is normal, not an error.
 */
export function visitorCity(req: Request): string | undefined {
  const raw = req.headers.get("x-vercel-ip-city") ?? req.headers.get("cloudfront-viewer-city");
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
