import { NextResponse } from "next/server";
import { cleanText } from "@/lib/ai/copilotLlm";
import { isRateLimited } from "@/lib/server/rateLimit";
import { listEvents, saveEvent, storageMode } from "@/lib/server/serverStore";
import { DEFAULT_STORE_ID, STORES } from "@/lib/store/stores";
import { ANALYTICS_EVENT_TYPES, AnalyticsEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const { rows, demo } = await listEvents();
  return NextResponse.json({ events: rows, demo, storage: storageMode });
}

export async function POST(req: Request) {
  if (isRateLimited(req, "eventos", 120)) {
    return NextResponse.json({ error: "Muitos eventos" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  const type = ANALYTICS_EVENT_TYPES.find((t) => t === body.type);
  const label = cleanText(body.label, 160);
  if (!type || !label) {
    return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
  }

  const storeId = STORES.find((s) => s.id === body.storeId)?.id ?? DEFAULT_STORE_ID;
  const optional = (value: unknown, max: number) => cleanText(value, max) || undefined;
  const duration = typeof body.durationSec === "number" && body.durationSec >= 0 && body.durationSec < 36_000;

  const event: AnalyticsEvent = {
    id: optional(body.id, 40) ?? `ev-${crypto.randomUUID()}`,
    type,
    storeId,
    // Relogio do servidor: o do aparelho pode estar errado.
    timestamp: Date.now(),
    label,
    aisle: optional(body.aisle, 8),
    painTopic: optional(body.painTopic, 60),
    productName: optional(body.productName, 120),
    durationSec: duration ? Math.round(body.durationSec as number) : undefined,
    sessionId: optional(body.sessionId, 40),
    engine: optional(body.engine, 40),
    unmet: optional(body.unmet, 80),
  };

  try {
    await saveEvent(event);
  } catch (err) {
    console.warn("[analytics] falha ao gravar:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Falha ao gravar" }, { status: 503 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
