const WINDOW_MS = 60_000;
const MAX_REQUESTS = 20;

// ponytail: contador em memoria por instancia serverless; trocar por Redis/KV se houver abuso real
const hits = new Map<string, { count: number; resetAt: number }>();

/** scope separa as cotas: eventos de telemetria nao consomem a cota do chat. */
export function isRateLimited(req: Request, scope = "ia", max = MAX_REQUESTS, now = Date.now()): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anon";
  const key = `${scope}:${ip}`;
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    if (hits.size > 5000) hits.clear();
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > max;
}
