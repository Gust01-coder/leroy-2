import { DEFAULT_STORE_ID } from "./stores";
import {
  AnalyticsEvent,
  AnalyticsEventType,
  DynamicProjectList,
  HandoffTicket,
  HandoffTicketStatus,
} from "./types";

const STORAGE_EVENTS_KEY = "lm_copiloto_events_v4";
const STORAGE_TICKETS_KEY = "lm_copiloto_tickets_v4";
const STORAGE_PROJECTS_KEY = "lm_copiloto_projects_v4";
const STORAGE_STORE_KEY = "lm_copiloto_store_v4";

function hoursAgo(h: number): number {
  return Date.now() - Math.round(h * 3600 * 1000);
}

export const SEED_EVENTS: AnalyticsEvent[] = [
  {
    id: "seed-1",
    type: "list_generated",
    storeId: "es-vitoria",
    timestamp: hoursAgo(3.4),
    label: "Lista gerada: Reparo de torneira pingando",
    aisle: "H3",
    painTopic: "Torneira pingando",
    durationSec: 38,
  },
  {
    id: "seed-2",
    type: "esl_blink_triggered",
    storeId: "es-vitoria",
    timestamp: hoursAgo(3.25),
    label: 'ESL Pick-to-Light acionado: Reparo Universal 1/2" (H3 · Mód. 02)',
    aisle: "H3",
    painTopic: "Torneira pingando",
  },
  {
    id: "seed-3",
    type: "navigation_completed",
    storeId: "es-vitoria",
    timestamp: hoursAgo(3.1),
    label: "Navegação concluída (2 corredores · 88m)",
    aisle: "H3",
    painTopic: "Torneira pingando",
    durationSec: 165,
  },
  {
    id: "seed-4",
    type: "vision_scan",
    storeId: "es-vitoria",
    timestamp: hoursAgo(2.7),
    label: "Foto analisada: Sifão sanfonado sob a pia (94%)",
    aisle: "H2",
    painTopic: "Vazamento / Sifão",
    durationSec: 18,
  },
  {
    id: "seed-5",
    type: "list_generated",
    storeId: "es-vitoria",
    timestamp: hoursAgo(2.2),
    label: "Lista gerada: Pintura 3×4m (azul sereno)",
    aisle: "T2",
    painTopic: "Pintura de cômodo",
    durationSec: 49,
  },
  {
    id: "seed-6",
    type: "item_substituted",
    storeId: "es-vitoria",
    timestamp: hoursAgo(2.1),
    label: "Ruptura contornada: Selador 3,6L → Fundo Preparador 3,6L",
    aisle: "T3",
    productName: "Selador Acrílico Parede 3,6L",
  },
  {
    id: "seed-7",
    type: "compatibility_fixed",
    storeId: "es-vitoria",
    timestamp: hoursAgo(1.9),
    label: "2ª viagem evitada: Broca Vídea 8mm adicionada para Bucha S8",
    aisle: "F2",
    painTopic: "Instalar prateleira",
  },
  {
    id: "seed-8",
    type: "voice_command",
    storeId: "es-vitoria",
    timestamp: hoursAgo(1.6),
    label: 'Comando de voz: "Meu chuveiro parou de esquentar"',
    aisle: "E1",
    painTopic: "Chuveiro / Resistência",
  },
  {
    id: "seed-9",
    type: "install_service_added",
    storeId: "es-vitoria",
    timestamp: hoursAgo(1.4),
    label: "Leroy Merlin Instala adicionado: Instalação Segura de Chuveiro (R$ 139)",
    aisle: "E1",
    painTopic: "Chuveiro / Resistência",
  },
  {
    id: "seed-10",
    type: "semantic_search",
    storeId: "es-vitoria",
    timestamp: hoursAgo(1.2),
    label: 'Busca leiga: "borrachinha da torneira" → Reparo Universal 1/2"',
    aisle: "H3",
    painTopic: "Torneira pingando",
  },
  {
    id: "seed-11",
    type: "esl_blink_triggered",
    storeId: "es-vitoria",
    timestamp: hoursAgo(0.9),
    label: "ESL Pick-to-Light acionado: Conector de Emenda Wago (E1 · Mód. 04)",
    aisle: "E1",
    painTopic: "Chuveiro / Resistência",
  },
  {
    id: "seed-12",
    type: "handoff_requested",
    storeId: "es-vitoria",
    timestamp: hoursAgo(0.45),
    label: "Handoff humano LM-4821: Trinca > 30cm com infiltração",
    aisle: "M4",
    painTopic: "Trinca / Infiltração",
  },
  {
    id: "seed-13",
    type: "navigation_completed",
    storeId: "es-vitoria",
    timestamp: hoursAgo(0.25),
    label: "Navegação concluída (3 corredores · 116m)",
    aisle: "F3",
    painTopic: "Instalar prateleira",
    durationSec: 192,
  },
];

export const SEED_TICKETS: HandoffTicket[] = [
  {
    id: "LM-4821",
    storeId: "es-vitoria",
    customerPain: "Trinca diagonal acima de 40cm na parede do banheiro com infiltração",
    category: "Materiais Básicos",
    complexity: "Alta",
    specialistName: "Carlos Eduardo",
    specialistRole: "Especialista em Obras & Estrutural",
    aisle: "M4",
    etaMinutes: 3,
    status: "a_caminho",
    summary:
      "Cliente relatou trinca profunda com manchas de umidade próxima ao box. IA recomendou avaliação técnica de impermeabilização.",
    highlights: [
      "Apareceu uma trinca grande na parede do banheiro",
      "Mais de 30cm com bolha de umidade",
      "Solicitou apoio do especialista em M4",
    ],
    createdAt: hoursAgo(0.45),
  },
  {
    id: "LM-4790",
    storeId: "es-vitoria",
    customerPain: "Disjuntor do chuveiro 220V desarmando após 5 minutos de banho",
    category: "Elétrica",
    complexity: "Alta",
    specialistName: "Roberto Almeida",
    specialistRole: "Técnico em Elétrica & Iluminação",
    aisle: "E1",
    etaMinutes: 2,
    status: "em_atendimento",
    summary:
      "Possível subdimensionamento de cabo ou conector derretido. Cliente encaminhado para revisão de bitola e disjuntor.",
    highlights: [
      "Chuveiro desarmando o disjuntor",
      "Cheiro leve de fio aquecido",
    ],
    createdAt: hoursAgo(1.2),
  },
];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getSelectedStoreId(): string {
  if (!isBrowser()) return DEFAULT_STORE_ID;
  return window.localStorage.getItem(STORAGE_STORE_KEY) || DEFAULT_STORE_ID;
}

export function setSelectedStoreId(storeId: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_STORE_KEY, storeId);
  window.dispatchEvent(new CustomEvent("lm:store-changed", { detail: storeId }));
}

export function getStoredEvents(): AnalyticsEvent[] {
  if (!isBrowser()) return SEED_EVENTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_EVENTS_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(SEED_EVENTS));
      return SEED_EVENTS;
    }
    const parsed = JSON.parse(raw) as AnalyticsEvent[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_EVENTS;
  } catch {
    return SEED_EVENTS;
  }
}

const STORAGE_SESSION_KEY = "lm_copiloto_session";

function getSessionId(): string {
  let id = window.sessionStorage.getItem(STORAGE_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID().slice(0, 13);
    window.sessionStorage.setItem(STORAGE_SESSION_KEY, id);
  }
  return id;
}

export function trackEvent(input: {
  type: AnalyticsEventType;
  storeId?: string;
  label: string;
  aisle?: string;
  painTopic?: string;
  productName?: string;
  durationSec?: number;
  engine?: string;
  unmet?: string;
}): AnalyticsEvent {
  const event: AnalyticsEvent = {
    id: `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type: input.type,
    storeId: input.storeId || getSelectedStoreId(),
    timestamp: Date.now(),
    label: input.label,
    aisle: input.aisle,
    painTopic: input.painTopic,
    productName: input.productName,
    durationSec: input.durationSec,
    sessionId: isBrowser() ? getSessionId() : undefined,
    engine: input.engine,
    unmet: input.unmet,
  };

  if (isBrowser()) {
    const existing = getStoredEvents();
    const updated = [event, ...existing].slice(0, 150);
    window.localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("lm:telemetry-updated"));

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {});
  }

  return event;
}

export function getStoredTickets(): HandoffTicket[] {
  if (!isBrowser()) return SEED_TICKETS;
  try {
    const raw = window.localStorage.getItem(STORAGE_TICKETS_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(SEED_TICKETS));
      return SEED_TICKETS;
    }
    const parsed = JSON.parse(raw) as HandoffTicket[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_TICKETS;
  } catch {
    return SEED_TICKETS;
  }
}

export function saveHandoffTicket(ticket: HandoffTicket): void {
  if (!isBrowser()) return;
  const existing = getStoredTickets().filter((t) => t.id !== ticket.id);
  const updated = [ticket, ...existing].slice(0, 40);
  window.localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("lm:telemetry-updated"));
}

export function updateHandoffTicketStatus(
  ticketId: string,
  status: HandoffTicketStatus
): HandoffTicket[] {
  if (!isBrowser()) return SEED_TICKETS;
  const updated = getStoredTickets().map((t) =>
    t.id === ticketId ? { ...t, status } : t
  );
  window.localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("lm:telemetry-updated"));
  return updated;
}

export function saveDynamicProject(project: DynamicProjectList): void {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(STORAGE_PROJECTS_KEY);
    const map: Record<string, DynamicProjectList> = raw ? JSON.parse(raw) : {};
    map[project.id] = project;
    window.localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

export function getDynamicProject(id: string): DynamicProjectList | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, DynamicProjectList>;
    return map[id] ?? null;
  } catch {
    return null;
  }
}

const PAIN_TOPIC_MAP: Record<string, string> = {
  pintura: "Pintura de cômodo",
  torneira: "Torneira pingando",
  trinca: "Trinca / Infiltração",
  prateleira: "Instalar prateleira",
  eletrica: "Chuveiro / Resistência",
  iluminacao: "Iluminação LED",
  catalogo: "Busca Semântica",
  "busca-semantica": "Busca Semântica",
};

function normalizePainTopic(topic?: string): string | undefined {
  if (!topic) return undefined;
  return PAIN_TOPIC_MAP[topic.toLowerCase()] ?? topic;
}

const JOURNEY_TYPES = new Set<AnalyticsEventType>([
  "chat_message",
  "voice_command",
  "semantic_search",
  "vision_scan",
  "list_generated",
  "handoff_requested",
]);

function topCounts(values: Array<string | undefined>, limit: number) {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Todo numero sai dos eventos recebidos; sem dado, null (o painel mostra "—"). */
export function computeAnalyticsSummary(events: AnalyticsEvent[], tickets: HandoffTicket[]) {
  const count = (type: AnalyticsEventType) => events.filter((e) => e.type === type).length;

  // Jornada = uma visita (sessionId). Evento sem sessao, como os de exemplo, conta como uma.
  const journeys = new Map<string, boolean>();
  for (const e of events) {
    if (!JOURNEY_TYPES.has(e.type)) continue;
    const key = e.sessionId ?? e.id;
    journeys.set(key, journeys.get(key) === true || e.type === "handoff_requested");
  }
  const totalJourneys = journeys.size;
  const selfServed = Array.from(journeys.values()).filter((handoff) => !handoff).length;

  const durations = events
    .filter((e) => e.type === "list_generated" && typeof e.durationSec === "number")
    .map((e) => e.durationSec as number);

  const aisleHeatMap: Record<string, number> = {};
  for (const e of events) if (e.aisle) aisleHeatMap[e.aisle] = (aisleHeatMap[e.aisle] ?? 0) + 1;

  const answered = events.filter((e) => e.engine);
  const local = answered.filter((e) => e.engine === "local").length;

  return {
    totalJourneys,
    liveEventsCount: events.length,
    autonomyRate: totalJourneys > 0 ? Math.round((selfServed / totalJourneys) * 100) : null,
    avgDiagnosisSec:
      durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    eslBlinks: count("esl_blink_triggered"),
    secondTripsPrevented: count("compatibility_fixed") + count("item_substituted"),
    installIntents: count("install_service_added"),
    handoffs: Math.max(count("handoff_requested"), tickets.length),
    topPains: topCounts(events.map((e) => normalizePainTopic(e.painTopic)), 6).map(({ key, count }) => ({ topic: key, count })),
    aisleHeatMap,
    outOfStockAlerts: topCounts(
      events.filter((e) => e.type === "item_substituted").map((e) => e.productName),
      6
    ).map(({ key, count }) => ({ productName: key, hits: count })),
    aiReplies: { total: answered.length, local },
    topUnmet: topCounts(events.map((e) => e.unmet?.toLowerCase()), 5).map(({ key, count }) => ({ need: key, count })),
  };
}

export function eventsToCsv(events: AnalyticsEvent[]): string {
  const header = "id,timestamp_iso,type,store_id,session_id,engine,aisle,pain_topic,unmet,label";
  const rows = events.map((e) => {
    const esc = (v?: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    return [
      esc(e.id),
      esc(new Date(e.timestamp).toISOString()),
      esc(e.type),
      esc(e.storeId),
      esc(e.sessionId),
      esc(e.engine),
      esc(e.aisle),
      esc(e.painTopic),
      esc(e.unmet),
      esc(e.label),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}
