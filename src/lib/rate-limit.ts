// A small per-visitor limit for endpoints that cost money to serve. Kept in
// memory per server instance, which is enough to stop casual abuse.
const hits = new Map<string, number[]>();

export function allow(req: Request, bucket: string, limit: number, windowMs: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  hits.set(key, [...recent, now]);
  return true;
}
