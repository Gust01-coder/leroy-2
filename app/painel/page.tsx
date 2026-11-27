"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StoreBar } from "@/components/StoreBar";
import { StoreMap } from "@/components/StoreMap";
import { ProductThumb } from "@/components/ProductThumb";
import {
  ArrowRightIcon,
  ChartIcon,
  CheckCircleIcon,
  DownloadIcon,
  MapIcon,
  RadioIcon,
  SearchIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  UserCheckIcon,
  WrenchIcon,
} from "@/components/Icons";
import { semanticSearchCatalog } from "@/lib/semanticSearch";
import { getStoreById } from "@/lib/stores";
import {
  computeAnalyticsSummary,
  eventsToCsv,
  getSelectedStoreId,
  getStoredEvents,
  getStoredTickets,
  updateHandoffTicketStatus,
} from "@/lib/telemetry";
import {
  AnalyticsEvent,
  HandoffTicket,
  HandoffTicketStatus,
} from "@/lib/types";
import { corridorOf } from "@/lib/storeMap";

type PanelTab = "atendimento" | "planta" | "dados";

const STATUS_META: Record<
  HandoffTicketStatus,
  { label: string; badgeClass: string }
> = {
  aguardando: {
    label: "Aguardando",
    badgeClass: "bg-amberwarn-soft text-amberwarn",
  },
  a_caminho: {
    label: "A caminho",
    badgeClass: "bg-amberwarn-soft text-amberwarn",
  },
  em_atendimento: {
    label: "Em atendimento",
    badgeClass: "bg-leroy-soft text-leroy-deep",
  },
  resolvido: {
    label: "Resolvido",
    badgeClass: "bg-floor text-signage-muted",
  },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  list_generated: "Lista gerada",
  vision_scan: "Foto (Visão)",
  voice_command: "Voz",
  semantic_search: "Busca",
  esl_blink_triggered: "ESL Piscante",
  compatibility_fixed: "2ª Viagem Evitada",
  tier_switched: "Orçamento",
  install_service_added: "Leroy Instala",
  navigation_started: "Rota iniciada",
  navigation_completed: "Rota concluída",
  checkout_completed: "Pedido concluído",
  handoff_requested: "Handoff",
  item_substituted: "Substituição",
  item_checked: "Coletado",
  tutorial_viewed: "Tutorial",
  chat_message: "Diagnóstico",
  store_changed: "Loja",
  session_start: "Sessão",
};

const COMPANION_SHORTCUTS = [
  "drywall bucha",
  "chuveiro 220v wago",
  "torneira monocomando",
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatTimeAgo(ts: number): string {
  const diffMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `há ${h}h${m > 0 ? ` ${m}m` : ""}`;
}

export default function PainelPage() {
  const [storeId, setStoreId] = useState("es-vitoria");
  const [activeTab, setActiveTab] = useState<PanelTab>("atendimento");
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [tickets, setTickets] = useState<HandoffTicket[]>([]);
  const [companionQuery, setCompanionQuery] = useState("chuveiro 220v wago");
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [demo, setDemo] = useState(false);
  const [storage, setStorage] = useState<string | null>(null);

  // Fonte e o servidor (todos os aparelhos da loja); offline, o que este aparelho registrou.
  const reload = async () => {
    try {
      const [evRes, tkRes] = await Promise.all([fetch("/api/analytics"), fetch("/api/handoff")]);
      if (!evRes.ok || !tkRes.ok) throw new Error(`HTTP ${evRes.status}/${tkRes.status}`);
      const ev = await evRes.json();
      const tk = await tkRes.json();
      setEvents(ev.events);
      setDemo(ev.demo);
      setStorage(ev.storage);
      // Chamado de exemplo nao existe no servidor: manter o status mudado aqui.
      setTickets((prev) => (tk.demo && prev.length > 0 ? prev : tk.tickets));
    } catch {
      setEvents(getStoredEvents());
      setTickets(getStoredTickets());
      setStorage(null);
    }
  };

  useEffect(() => {
    setStoreId(getSelectedStoreId());
    reload();
    const timer = window.setInterval(() => {
      if (!document.hidden) reload();
    }, 5000);

    const onStore = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) setStoreId(next);
    };
    window.addEventListener("lm:store-changed", onStore);
    window.addEventListener("lm:telemetry-updated", reload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("lm:store-changed", onStore);
      window.removeEventListener("lm:telemetry-updated", reload);
    };
  }, []);

  const summary = useMemo(
    () => computeAnalyticsSummary(events, tickets),
    [events, tickets]
  );

  const companionResults = useMemo(
    () =>
      semanticSearchCatalog(companionQuery, storeId, {
        limit: 3,
      }),
    [companionQuery, storeId]
  );

  const activeStore = getStoreById(storeId);
  const openTicketsCount = tickets.filter((t) => t.status !== "resolvido").length;

  function changeTicketStatus(ticketId: string, status: HandoffTicketStatus) {
    updateHandoffTicketStatus(ticketId, status);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status } : t)));
    fetch("/api/handoff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticketId, status }),
    }).catch(() => {});
  }

  function downloadFile(content: string, fileName: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    // Revogar no mesmo tick cancela o download no Safari e no Firefox.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      store: activeStore.name,
      summary,
      tickets,
      events,
    };
    downloadFile(
      JSON.stringify(payload, null, 2),
      `lm-copiloto-dados-${storeId}.json`,
      "application/json"
    );
  }

  function exportCsv() {
    downloadFile(
      eventsToCsv(events),
      `lm-copiloto-eventos-${storeId}.csv`,
      "text/csv;charset=utf-8"
    );
  }

  const maxPainCount = Math.max(1, ...summary.topPains.map((p) => p.count));
  const visibleEvents = showAllEvents ? events : events.slice(0, 8);

  return (
    <div className="flex min-h-screen flex-col bg-floor">
      <StoreBar />

      {/* Header compacto */}
      <section className="blueprint-grid border-b border-signage bg-signage text-white">
        <div className="container-wide flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-leroy">
              <span className="h-2 w-2 rounded-full bg-leroy" />
              Console do Vendedor · Operações
            </div>
            <h1 className="mt-1 font-display text-[24px] font-extrabold text-white sm:text-[28px]">
              {activeStore.name}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-signage-soft px-3 py-2 text-[12px] font-semibold text-white transition hover:border-leroy hover:text-leroy"
            >
              <DownloadIcon size={14} />
              CSV
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="btn-accent !px-3.5 !py-2 !text-[12px]"
            >
              <DownloadIcon size={14} />
              JSON
            </button>
          </div>
        </div>
      </section>

      <main className="container-wide flex-1 space-y-6 py-6">
        {demo && (
          <p role="status" className="rounded-lg border border-amberwarn bg-amberwarn-soft px-3.5 py-2.5 text-[12.5px] text-signage">
            <strong>Dados de exemplo.</strong> Ainda não há eventos reais nesta instalação; os números abaixo
            são trocados pelos reais assim que o primeiro cliente usar o app.
          </p>
        )}

        {/* 4 KPIs principais (espaçados e legíveis) */}
        <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <KpiCard
            label="Jornadas"
            value={String(summary.totalJourneys)}
            sub={`${summary.liveEventsCount} eventos registrados`}
          />
          <KpiCard
            label="Autoatendimento"
            value={summary.autonomyRate === null ? "—" : `${summary.autonomyRate}%`}
            sub="Resolvidos sem fila"
            accent
          />
          <KpiCard
            label="2ªs viagens evitadas"
            value={String(summary.secondTripsPrevented)}
            sub="Auditoria + substituições"
            Icon={ShieldCheckIcon}
          />
          <KpiCard
            label="Chamados ativos"
            value={String(openTicketsCount)}
            sub="Aguardando vendedor"
            Icon={UserCheckIcon}
          />
        </section>

        {/* Navegação em 3 abas focadas (zero sobrecarga cognitiva) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-3">
          <div className="flex w-full overflow-x-auto rounded-xl border border-rule-strong bg-white p-1 sm:inline-flex sm:w-auto">
            <TabButton
              active={activeTab === "atendimento"}
              onClick={() => setActiveTab("atendimento")}
              icon={<UserCheckIcon size={14} />}
              label="Atendimento"
              badge={openTicketsCount > 0 ? String(openTicketsCount) : undefined}
            />
            <TabButton
              active={activeTab === "planta"}
              onClick={() => setActiveTab("planta")}
              icon={<MapIcon size={14} />}
              label="Planta"
              badge={
                summary.outOfStockAlerts.length > 0
                  ? String(summary.outOfStockAlerts.length)
                  : undefined
              }
            />
            <TabButton
              active={activeTab === "dados"}
              onClick={() => setActiveTab("dados")}
              icon={<ChartIcon size={14} />}
              label="Dados"
            />
          </div>

          <Link
            href="/chat?q=Apareceu%20uma%20trinca%20na%20parede%20do%20banheiro"
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-leroy-deep hover:underline"
          >
            Simular novo chamado
            <ArrowRightIcon size={13} />
          </Link>
        </div>

        {/* ===== ABA 1: ATENDIMENTO (FILA DE HANDOFF + BUSCA COMPANION) ===== */}
        {activeTab === "atendimento" && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Fila de Handoff (7 cols) */}
            <div className="space-y-3 lg:col-span-7">
              <h2 className="font-display text-[17px] font-bold text-signage">
                Chamados de clientes
              </h2>

              {tickets.map((ticket) => {
                const st = STATUS_META[ticket.status];
                return (
                  <div
                    key={ticket.id}
                    className={`panel p-4 transition ${
                      ticket.status === "resolvido" ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="aisle-plate">{corridorOf(ticket.aisle)}</span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.badgeClass}`}
                        >
                          {st.label}
                        </span>
                        <span className="font-mono text-[11px] text-signage-subtle">
                          {ticket.id}
                        </span>
                      </div>
                      <span className="text-[11.5px] text-signage-subtle">
                        {formatTimeAgo(ticket.createdAt)}
                      </span>
                    </div>

                    <h3 className="mt-2.5 font-display text-[15.5px] font-bold text-signage">
                      {ticket.customerPain}
                    </h3>
                    <p className="mt-1 text-[13px] text-signage-muted">
                      {ticket.summary}
                    </p>

                    {ticket.highlights.length > 0 && (
                      <ul className="mt-2.5 space-y-1 rounded-lg bg-floor px-3 py-2.5 text-[12px] text-signage">
                        {ticket.highlights.slice(0, 3).map((h, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="font-bold text-leroy-dark">·</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-3">
                      <span className="text-[12px] text-signage-muted">
                        <strong className="font-semibold text-signage">
                          {ticket.specialistName}
                        </strong>{" "}
                        · {ticket.category}
                      </span>

                      <div className="flex items-center gap-2">
                        {ticket.status !== "em_atendimento" &&
                          ticket.status !== "resolvido" && (
                            <button
                              type="button"
                              onClick={() =>
                                changeTicketStatus(ticket.id, "em_atendimento")
                              }
                              className="rounded-lg bg-signage px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-signage-soft"
                            >
                              Assumir
                            </button>
                          )}
                        {ticket.status !== "resolvido" && (
                          <button
                            type="button"
                            onClick={() =>
                              changeTicketStatus(ticket.id, "resolvido")
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-leroy px-3 py-1.5 text-[12px] font-bold text-signage transition hover:bg-leroy-dark hover:text-white"
                          >
                            <CheckCircleIcon size={13} />
                            Concluir
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Busca Técnica Companion (5 cols) */}
            <div className="lg:col-span-5">
              <div className="panel p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-[16px] font-bold text-signage">
                    Busca Rápida do Vendedor
                  </h2>
                  <span className="font-mono text-[10px] font-semibold uppercase text-leroy-deep">
                    Corredor + estoque
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-signage-muted">
                  Consulte corredor, prateleira e estoque ao vivo durante o atendimento.
                </p>

                <div className="relative mt-3 flex items-center">
                  <SearchIcon
                    size={15}
                    className="pointer-events-none absolute left-3 text-signage-subtle"
                  />
                  <input
                    type="text"
                    value={companionQuery}
                    onChange={(e) => setCompanionQuery(e.target.value)}
                    placeholder="Buscar peça, SKU ou compatibilidade…"
                    className="h-10 w-full rounded-lg border border-rule-strong bg-floor pl-9 pr-3 text-[13px] outline-none focus:border-signage focus:bg-white"
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {COMPANION_SHORTCUTS.map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => setCompanionQuery(sc)}
                      className="rounded-full bg-floor px-2.5 py-0.5 text-[11px] font-medium text-signage-muted transition hover:bg-signage hover:text-white"
                    >
                      {sc}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-2.5">
                  {companionResults.map(({ product, stockQty, inStock }) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-lg border border-rule bg-floor/50 p-2.5"
                    >
                      <ProductThumb
                        src={product.imageUrl}
                        alt={product.name}
                        category={product.category}
                        size={56}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-signage">
                          {product.name}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-signage-muted">
                          <span className="font-mono font-bold text-signage">
                            {product.corridorCode}
                          </span>
                          {" · "}
                          {product.shelfLocation}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="font-mono text-[13px] font-bold text-signage">
                          {formatBRL(product.price)}
                        </div>
                        <div
                          className={`text-[10.5px] font-semibold ${
                            inStock ? "text-leroy-deep" : "text-danger"
                          }`}
                        >
                          {inStock ? `${stockQty} un.` : "Ruptura"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===== ABA 2: PLANTA 2D & ESTOQUE ===== */}
        {activeTab === "planta" && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <StoreMap heatmapCounts={summary.aisleHeatMap} />
            </div>

            <div className="lg:col-span-4">
              <div className="panel p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="kicker text-amberwarn">Reposição Proativa</span>
                    <h2 className="mt-0.5 font-display text-[17px] font-bold text-signage">
                      Alertas de ruptura
                    </h2>
                  </div>
                  <ShieldAlertIcon size={18} className="text-amberwarn" />
                </div>

                <ul className="mt-4 divide-y divide-rule">
                  {summary.outOfStockAlerts.length === 0 && (
                    <li className="py-3 text-[13px] text-signage-muted">Nenhuma ruptura registrada.</li>
                  )}
                  {summary.outOfStockAlerts.map((al) => (
                    <li
                      key={al.productName}
                      className="flex items-center justify-between gap-2 py-3 text-[13px]"
                    >
                      <span className="font-medium text-signage">
                        {al.productName}
                      </span>
                      <span className="flex-shrink-0 rounded-full bg-amberwarn-soft px-2.5 py-0.5 font-mono text-[11px] font-bold text-amberwarn">
                        {al.hits}×
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* ===== ABA 3: DADOS & EVENTOS ===== */}
        {activeTab === "dados" && (
          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="panel p-5 lg:col-span-7">
                <h2 className="font-display text-[17px] font-bold text-signage">
                  Principais dores coletadas
                </h2>
                <div className="mt-4 space-y-3.5">
                  {summary.topPains.map((item) => {
                    const pct = Math.round((item.count / maxPainCount) * 100);
                    return (
                      <div key={item.topic}>
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-medium text-signage">
                            {item.topic}
                          </span>
                          <span className="font-mono text-[12px] font-bold text-signage-muted">
                            {item.count}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-floor-deep">
                          <div
                            className="h-full rounded-full bg-leroy transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <h3 className="mt-6 font-display text-[15px] font-bold text-signage">
                  Demanda não atendida
                </h3>
                <p className="text-[12px] text-signage-muted">O que clientes pediram e o catálogo não tinha.</p>
                <ul className="mt-2 divide-y divide-rule">
                  {summary.topUnmet.length === 0 && (
                    <li className="py-2.5 text-[13px] text-signage-muted">Nada registrado ainda.</li>
                  )}
                  {summary.topUnmet.map((u) => (
                    <li key={u.need} className="flex items-center justify-between gap-2 py-2.5 text-[13px]">
                      <span className="min-w-0 break-words font-medium text-signage">{u.need}</span>
                      <span className="flex-shrink-0 font-mono text-[12px] font-bold text-signage-muted">{u.count}×</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel flex flex-col justify-between p-5 lg:col-span-5">
                <h2 className="font-display text-[17px] font-bold text-signage">
                  Indicadores de eficiência
                </h2>
                <div className="mt-4 divide-y divide-rule">
                  <MetricRow
                    icon={<RadioIcon size={15} className="text-leroy-dark" />}
                    label="Etiquetas ESL acionadas"
                    value={String(summary.eslBlinks)}
                  />
                  <MetricRow
                    icon={<WrenchIcon size={15} className="text-leroy-dark" />}
                    label="Intenções Leroy Instala"
                    value={String(summary.installIntents)}
                  />
                  <MetricRow
                    icon={<ChartIcon size={15} className="text-leroy-dark" />}
                    label="Tempo médio de diagnóstico"
                    value={summary.avgDiagnosisSec === null ? "—" : `${summary.avgDiagnosisSec}s`}
                  />
                  <MetricRow
                    icon={<ShieldCheckIcon size={15} className="text-leroy-dark" />}
                    label="Respostas pela IA (resto: motor local)"
                    value={
                      summary.aiReplies.total === 0
                        ? "—"
                        : `${Math.round(((summary.aiReplies.total - summary.aiReplies.local) / summary.aiReplies.total) * 100)}%`
                    }
                  />
                </div>
                <div className="mt-4 rounded-lg bg-floor px-3 py-2 font-mono text-[11px] text-signage-muted">
                  Dados em:{" "}
                  <strong className="text-signage">
                    {storage === "postgres" ? "Postgres (Neon)" : storage === "memoria" ? "memória do servidor" : "este aparelho (offline)"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-[17px] font-bold text-signage">
                  Log de eventos ({events.length})
                </h2>
                {events.length > 8 && (
                  <button
                    type="button"
                    onClick={() => setShowAllEvents((v) => !v)}
                    className="text-[12.5px] font-semibold text-leroy-deep hover:underline"
                  >
                    {showAllEvents ? "Mostrar menos" : `Ver todos (${events.length})`}
                  </button>
                )}
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-rule font-mono text-[10.5px] uppercase tracking-wider text-signage-subtle">
                      <th className="pb-2.5 pr-4 font-semibold">Tipo</th>
                      <th className="pb-2.5 pr-4 font-semibold">Evento</th>
                      <th className="pb-2.5 pr-4 font-semibold">Corredor</th>
                      <th className="pb-2.5 text-right font-semibold">Quando</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {visibleEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-floor/60">
                        <td className="whitespace-nowrap py-2.5 pr-4">
                          <span className="rounded bg-floor px-2 py-0.5 font-mono text-[11px] font-semibold text-signage">
                            {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-signage">{ev.label}</td>
                        <td className="whitespace-nowrap py-2.5 pr-4">
                          {ev.aisle ? (
                            <span className="aisle-plate">{corridorOf(ev.aisle)}</span>
                          ) : (
                            <span className="text-signage-subtle">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap py-2.5 text-right font-mono text-[11.5px] text-signage-subtle">
                          {formatTimeAgo(ev.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition sm:flex-none sm:px-3.5 ${
        active
          ? "bg-signage text-white shadow-sm"
          : "text-signage-muted hover:text-signage"
      }`}
    >
      <span className={active ? "text-leroy" : ""}>{icon}</span>
      <span>{label}</span>
      {badge && (
        <span
          className={`rounded-full px-1.5 py-0.5 font-mono text-[10.5px] font-bold ${
            active
              ? "bg-leroy text-signage"
              : "bg-floor text-signage-muted"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2.5 text-[13.5px] text-signage-muted">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-mono text-[16px] font-extrabold text-signage">
        {value}
      </span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  Icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  Icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-leroy bg-signage text-white"
          : "border-rule bg-white text-signage"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[12px] font-medium ${
            accent ? "text-white/70" : "text-signage-muted"
          }`}
        >
          {label}
        </span>
        {Icon && (
          <Icon
            size={15}
            className={accent ? "text-leroy" : "text-leroy-dark"}
          />
        )}
      </div>
      <div
        className={`mt-2 font-mono text-[30px] font-extrabold leading-none tabular-nums ${
          accent ? "text-leroy" : "text-signage"
        }`}
      >
        {value}
      </div>
      <div
        className={`mt-1.5 text-[11.5px] ${
          accent ? "text-white/65" : "text-signage-subtle"
        }`}
      >
        {sub}
      </div>
    </div>
  );
}
