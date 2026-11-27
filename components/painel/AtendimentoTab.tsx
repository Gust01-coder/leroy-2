import { CheckCircleIcon, SearchIcon } from "@/components/Icons";
import { ProductThumb } from "@/components/ProductThumb";
import { formatBRL, formatTimeAgo } from "@/lib/format";
import { corridorOf } from "@/lib/store/storeMap";
import type { AnalyticsEvent, HandoffTicket, HandoffTicketStatus } from "@/lib/types";
import type { computeAnalyticsSummary } from "@/lib/telemetry";
import type { semanticSearchCatalog } from "@/lib/ai/semanticSearch";

const COMPANION_SHORTCUTS = [
  "drywall bucha",
  "chuveiro 220v wago",
  "torneira monocomando",
];

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

type Props = {
  events: AnalyticsEvent[];
  tickets: HandoffTicket[];
  companionQuery: string;
  setCompanionQuery: (value: string) => void;
  summary: ReturnType<typeof computeAnalyticsSummary>;
  companionResults: ReturnType<typeof semanticSearchCatalog>;
  changeTicketStatus: (ticketId: string, status: HandoffTicketStatus) => void;
};

export function AtendimentoTab({ events, tickets, companionQuery, setCompanionQuery, summary, companionResults, changeTicketStatus }: Props) {
  return (
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
  );
}
