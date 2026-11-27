"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StoreBar } from "@/components/StoreBar";
import {
  ArrowRightIcon,
  ChartIcon,
  DownloadIcon,
  MapIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "@/components/Icons";
import { semanticSearchCatalog } from "@/lib/ai/semanticSearch";
import { getStoreById } from "@/lib/store/stores";
import { AtendimentoTab } from "@/components/painel/AtendimentoTab";
import { DadosTab } from "@/components/painel/DadosTab";
import { KpiCard } from "@/components/painel/KpiCard";
import { PlantaTab } from "@/components/painel/PlantaTab";
import { StaffLoginGate, type StaffSession } from "@/components/painel/StaffLoginGate";
import { TabButton } from "@/components/painel/TabButton";
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

type PanelTab = "atendimento" | "planta" | "dados";

const STAFF_SESSION_KEY = "lm_copiloto_staff_session_v1";

export default function PainelPage() {
  const [storeId, setStoreId] = useState("es-vitoria");
  const [staffSession, setStaffSession] = useState<StaffSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
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
    try {
      const saved = window.sessionStorage.getItem(STAFF_SESSION_KEY);
      if (saved) setStaffSession(JSON.parse(saved) as StaffSession);
    } catch {
      // sessionStorage indisponivel
    } finally {
      setAuthChecked(true);
    }
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

  function handleStaffLogin(session: StaffSession) {
    setStaffSession(session);
    try {
      window.sessionStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
    } catch {
      // ignora em modo privado restrito
    }
  }

  function handleStaffLogout() {
    setStaffSession(null);
    try {
      window.sessionStorage.removeItem(STAFF_SESSION_KEY);
    } catch {
      // ignora
    }
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen flex-col bg-floor">
        <StoreBar />
      </div>
    );
  }

  if (!staffSession) {
    return (
      <div className="flex min-h-screen flex-col bg-floor">
        <StoreBar />
        <StaffLoginGate
          storeName={activeStore.name}
          onAuthenticated={handleStaffLogin}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-floor">
      <StoreBar />

      {/* Header compacto */}
      <section className="blueprint-grid border-b border-signage bg-signage text-white">
        <div className="container-wide flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-leroy">
              <span className="h-2 w-2 rounded-full bg-leroy" />
              Console do Vendedor · {staffSession.name} ({staffSession.badgeId})
            </div>
            <h1 className="mt-1 font-display text-[24px] font-extrabold text-white sm:text-[28px]">
              {activeStore.name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-white/20 bg-signage-soft px-3 py-2 text-[12px] font-semibold text-white transition hover:border-leroy hover:text-leroy"
            >
              <DownloadIcon size={14} />
              CSV
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="btn-accent !min-h-[40px] !px-3.5 !py-2 !text-[12px]"
            >
              <DownloadIcon size={14} />
              JSON
            </button>
            <button
              type="button"
              onClick={handleStaffLogout}
              className="inline-flex min-h-[40px] items-center rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/75 transition hover:border-white/40 hover:text-white"
            >
              Sair
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

        {activeTab === "atendimento" && (
          <AtendimentoTab
            events={events}
            tickets={tickets}
            companionQuery={companionQuery}
            setCompanionQuery={setCompanionQuery}
            summary={summary}
            companionResults={companionResults}
            changeTicketStatus={changeTicketStatus}
          />
        )}

        {activeTab === "planta" && (
          <PlantaTab
            summary={summary}
          />
        )}

        {activeTab === "dados" && (
          <DadosTab
            events={events}
            showAllEvents={showAllEvents}
            setShowAllEvents={setShowAllEvents}
            storage={storage}
            summary={summary}
            maxPainCount={maxPainCount}
            visibleEvents={visibleEvents}
          />
        )}
      </main>
    </div>
  );
}
