import { ChartIcon, RadioIcon, ShieldCheckIcon, WrenchIcon } from "@/components/Icons";
import { formatTimeAgo } from "@/lib/format";
import { corridorOf } from "@/lib/store/storeMap";
import { MetricRow } from "@/components/painel/MetricRow";
import type { AnalyticsEvent } from "@/lib/types";
import type { computeAnalyticsSummary } from "@/lib/telemetry";
import type { Dispatch, SetStateAction } from "react";

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

type Props = {
  events: AnalyticsEvent[];
  showAllEvents: boolean;
  setShowAllEvents: Dispatch<SetStateAction<boolean>>;
  storage: string | null;
  summary: ReturnType<typeof computeAnalyticsSummary>;
  maxPainCount: number;
  visibleEvents: AnalyticsEvent[];
};

export function DadosTab({ events, showAllEvents, setShowAllEvents, storage, summary, maxPainCount, visibleEvents }: Props) {
  return (
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
  );
}
