import Link from "next/link";
import { Logo } from "@/components/Logo";
import { StoreBar } from "@/components/StoreBar";
import { BookOpenIcon, CheckCircleIcon, CheckIcon, MapIcon, QrCodeIcon, SparkleIcon } from "@/components/Icons";
import { OrderPassQr } from "@/components/checkout/OrderPassQr";
import { type CompletedOrder, formatBRL } from "@/lib/checkout/checkout";
import { paymentLabel } from "@/lib/checkout/labels";

type Props = {
  completedOrder: CompletedOrder;
  pixCopied: boolean;
  onCopyPix: () => void;
};

/** Tela final do checkout: passe digital de saída, Pix copia e cola e próximos passos. */
export function OrderConfirmation({ completedOrder, pixCopied, onCopyPix }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-floor">
      <StoreBar />

      <main className="container-wide flex-1 py-8">
        <div className="mx-auto max-w-[680px] space-y-5">
          {/* Cartão Passe Digital de Saída (estética Apple Store + Leroy Merlin) */}
          <section className="overflow-hidden rounded-3xl border border-rule bg-white shadow-floating">
            <div className="bg-signage px-6 py-5 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Logo variant="dark" showSubtitle={false} className="origin-left scale-95" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-leroy/20 px-3 py-1 text-[12px] font-bold text-leroy">
                  <CheckCircleIcon size={14} />
                  Pedido confirmado
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-[12px] text-white/60">
                    {completedOrder.fulfillment === "scan_and_go"
                      ? "Passe Digital de Saída Sem Fila"
                      : completedOrder.fulfillment === "clique_retire"
                      ? "Código de Retirada Expressa"
                      : "Comprovante de Entrega Expressa"}
                  </div>
                  <h1 className="mt-0.5 font-display text-[26px] font-extrabold tracking-tight text-white">
                    {completedOrder.code}
                  </h1>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-white/55">
                    Total pago
                  </div>
                  <div className="font-mono text-[24px] font-extrabold leading-none text-leroy">
                    {formatBRL(completedOrder.grandTotal)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col items-center gap-5 rounded-2xl border border-rule bg-floor/70 p-5 sm:flex-row">
                <div className="flex-shrink-0 rounded-2xl border border-rule bg-white p-3 shadow-card">
                  <OrderPassQr code={completedOrder.code} />
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-leroy-soft px-2.5 py-0.5 font-mono text-[11px] font-bold text-leroy-deep">
                    PIN DE LIBERAÇÃO · {completedOrder.exitPin}
                  </span>

                  <h2 className="mt-2 font-display text-[18px] font-extrabold text-signage">
                    {completedOrder.fulfillment === "scan_and_go"
                      ? "Passe direto na Saída Expressa"
                      : completedOrder.fulfillment === "clique_retire"
                      ? "Pronto em até 30 min na unidade"
                      : "Separação iniciada para entrega"}
                  </h2>

                  <p className="mt-1 text-[13px] leading-relaxed text-signage-muted">
                    {completedOrder.fulfillment === "scan_and_go"
                      ? `Mostre este QR Code ao colaborador na saída da ${completedOrder.storeName}. Sem passar pelo caixa.`
                      : completedOrder.fulfillment === "clique_retire"
                      ? `Apresente o código ${completedOrder.exitPin} no Balcão Clique & Retire ou Drive-Thru da ${completedOrder.storeName}.`
                      : `Entrega prevista para ${completedOrder.deliveryAddress}.`}
                  </p>

                  {completedOrder.clubMember && completedOrder.clubPoints > 0 && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-leroy-deep">
                      <SparkleIcon size={13} />
                      +{completedOrder.clubPoints} pontos no Clube Leroy Merlin Com Você
                    </div>
                  )}
                </div>
              </div>

              {/* Código Pix Copia e Cola quando pago via Pix */}
              {completedOrder.paymentMethod === "pix" && (
                <div className="mt-4 rounded-xl border border-rule bg-floor/50 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-signage">
                      Pix Instantâneo (5% OFF · economia de {formatBRL(completedOrder.pixDiscount)})
                    </span>
                    <button
                      type="button"
                      onClick={onCopyPix}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-signage px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-signage-soft"
                    >
                      {pixCopied ? (
                        <>
                          <CheckIcon size={13} className="text-leroy" />
                          Código copiado!
                        </>
                      ) : (
                        <>
                          <QrCodeIcon size={13} className="text-leroy" />
                          Copiar Pix Copia e Cola
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-2 truncate rounded-lg border border-rule bg-white px-3 py-2 font-mono text-[11px] text-signage-subtle">
                    {completedOrder.pixPayload}
                  </div>
                </div>
              )}

              {/* Detalhes resumidos */}
              <div className="mt-5 grid gap-3 border-t border-rule pt-4 text-[13px] sm:grid-cols-2">
                <div>
                  <div className="text-[11.5px] font-medium text-signage-subtle">Projeto</div>
                  <div className="font-semibold text-signage">
                    {completedOrder.projectTitle} ({completedOrder.itemsCount} itens)
                  </div>
                </div>
                <div>
                  <div className="text-[11.5px] font-medium text-signage-subtle">Pagamento</div>
                  <div className="font-semibold text-signage">
                    {paymentLabel(completedOrder.paymentMethod)}
                    {completedOrder.paymentMethod === "cartao" &&
                    completedOrder.installmentCount > 1
                      ? ` (${completedOrder.installmentCount}× sem juros)`
                      : ""}
                  </div>
                </div>
                {completedOrder.includeInstall && completedOrder.installSlot && (
                  <div className="sm:col-span-2 rounded-xl bg-leroy-soft/60 px-3.5 py-2.5 text-[12.5px] text-leroy-deep">
                    <strong>Leroy Merlin Instala agendado:</strong> {completedOrder.installSlot} (garantia de 12 meses).
                  </div>
                )}
              </div>

              {/* Ações pós-compra: fecha o ciclo DIY */}
              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                <Link
                  href={`/lista?id=${encodeURIComponent(completedOrder.projectId)}&tab=tutorial`}
                  className="btn-accent w-full"
                >
                  <BookOpenIcon size={15} />
                  Abrir passo a passo de instalação
                </Link>
                <Link
                  href={`/mapa?id=${encodeURIComponent(completedOrder.projectId)}`}
                  className="btn-secondary w-full"
                >
                  <MapIcon size={15} />
                  Ver mapa dos corredores
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-3 text-[12px] text-signage-subtle">
                <span>Ambiente demonstrativo · nenhuma cobrança real foi efetuada.</span>
                <Link href="/painel" className="font-semibold text-leroy-deep hover:underline">
                  Ver pedido registrado no Painel →
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>

  );
}
