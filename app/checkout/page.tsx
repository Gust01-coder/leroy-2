"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreBar } from "@/components/StoreBar";
import { ProductThumb } from "@/components/ProductThumb";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  ShieldCheckIcon,
  StoreIcon,
  WrenchIcon,
} from "@/components/Icons";
import { getProductById, getStockForStore } from "@/lib/catalog/catalog";
import {
  CompletedOrder,
  FulfillmentMode,
  PaymentMethod,
  STANDARD_DELIVERY_FEE,
  buildPixPayload,
  computeCheckoutTotals,
  formatBRL,
  generateOrderCode,
  saveCompletedOrder,
} from "@/lib/checkout/checkout";
import { auditProjectCompatibility } from "@/lib/catalog/compatibilityEngine";
import { getPresetProject, materializeProjectItems } from "@/lib/catalog/projects";
import { getStoreById } from "@/lib/store/stores";
import {
  getDynamicProject,
  getSelectedStoreId,
  saveDynamicProject,
  trackEvent,
} from "@/lib/telemetry";
import { getInstallServiceForIntent } from "@/lib/catalog/tiersAndServices";
import { CompatibilityAlert, DynamicProjectList } from "@/lib/types";
import { FulfillmentOption } from "@/components/checkout/FulfillmentOption";
import { OrderConfirmation } from "@/components/checkout/OrderConfirmation";
import { PaymentTile } from "@/components/checkout/PaymentTile";
import { fulfillmentLabel, paymentLabel } from "@/lib/checkout/labels";

const INSTALL_SLOTS = [
  "Amanhã · Manhã (08h–12h)",
  "Amanhã · Tarde (13h–17h)",
  "Sábado · Manhã (08h–12h)",
];

function CheckoutLoading() {
  return <div className="min-h-screen bg-floor" />;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutInner />
    </Suspense>
  );
}

function CheckoutInner() {
  const params = useSearchParams();
  const projectId = params.get("id") ?? "reparo-torneira";
  const initialInstall = params.get("install") === "1";

  const [storeId, setStoreId] = useState("es-vitoria");
  const [project, setProject] = useState<DynamicProjectList | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>("scan_and_go");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [installmentCount, setInstallmentCount] = useState(1);
  const [includeInstall, setIncludeInstall] = useState(initialInstall);
  const [installSlot, setInstallSlot] = useState(INSTALL_SLOTS[0]);

  const [cep, setCep] = useState("29090-000");
  const [street, setStreet] = useState("Av. Dante Michelini, Jardim Camburi");
  const [addressNumber, setAddressNumber] = useState("1240");
  const [cpf, setCpf] = useState("");
  const [clubMember, setClubMember] = useState(true);

  const [processing, setProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
    const currentStore = getSelectedStoreId();
    setStoreId(currentStore);

    const load = (stId: string) => {
      const stored = getDynamicProject(projectId);
      const base =
        stored ??
        getPresetProject(projectId, stId) ??
        getPresetProject("reparo-torneira", stId)!;
      const syncedItems = base.items.map((item) => {
        const prod = getProductById(item.productId);
        if (!prod) return item;
        const qty = getStockForStore(prod, stId);
        return { ...item, stockQty: qty, inStock: qty > 0 };
      });
      setProject({ ...base, storeId: stId, items: syncedItems });
    };

    load(currentStore);
    const onStore = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) {
        setStoreId(next);
        load(next);
      }
    };
    window.addEventListener("lm:store-changed", onStore);
    return () => window.removeEventListener("lm:store-changed", onStore);
  }, [projectId]);

  const activeItems = useMemo(() => {
    if (!project) return [];
    return project.items.filter((i) => !i.optional && i.inStock);
  }, [project]);

  const installService = useMemo(
    () => (project ? getInstallServiceForIntent(project.sourceIntent) : null),
    [project]
  );

  const audit = useMemo(
    () => (project ? auditProjectCompatibility(project, {}) : null),
    [project]
  );

  const totals = useMemo(
    () =>
      computeCheckoutTotals({
        items: activeItems,
        installPrice: installService?.price ?? 0,
        includeInstall: Boolean(includeInstall && installService),
        fulfillment,
        paymentMethod,
      }),
    [activeItems, installService, includeInstall, fulfillment, paymentMethod]
  );

  useEffect(() => {
    const maxCount = totals.installments[totals.installments.length - 1]?.count ?? 1;
    if (installmentCount > maxCount) setInstallmentCount(maxCount);
  }, [totals.installments, installmentCount]);

  function applyQuickAuditFix(alert: CompatibilityAlert) {
    if (!project || !alert.targetProductId) return;
    if (alert.fixType === "add_product") {
      const exists = project.items.some((i) => i.productId === alert.targetProductId);
      const nextItems = exists
        ? project.items.map((i) =>
            i.productId === alert.targetProductId ? { ...i, optional: false } : i
          )
        : [
            ...project.items,
            ...materializeProjectItems(
              [
                {
                  productId: alert.targetProductId,
                  quantity: 1,
                  reason: "Adicionado na verificação do checkout",
                },
              ],
              storeId
            ),
          ];
      const nextProj = { ...project, items: nextItems };
      setProject(nextProj);
      saveDynamicProject(nextProj);
      trackEvent({
        type: "compatibility_fixed",
        storeId,
        label: `Auditoria no checkout: ${alert.title}`,
        painTopic: project.sourceIntent,
      });
    }
  }

  function handleConfirmOrder() {
    if (!project || activeItems.length === 0 || processing) return;
    setProcessing(true);

    const activeStore = getStoreById(storeId);
    const { code, exitPin } = generateOrderCode(storeId);
    const pixPayload = buildPixPayload(code, totals.grandTotal, activeStore.city);

    const order: CompletedOrder = {
      code,
      exitPin,
      storeId,
      storeName: activeStore.name,
      projectId: project.id,
      projectTitle: project.title,
      fulfillment,
      paymentMethod,
      installmentCount: paymentMethod === "cartao" ? installmentCount : 1,
      includeInstall: Boolean(includeInstall && installService),
      installSlot: includeInstall && installService ? installSlot : undefined,
      deliveryAddress:
        fulfillment === "entrega"
          ? `${street}, ${addressNumber || "s/n"} · CEP ${cep}`
          : undefined,
      cpfOnReceipt: cpf.trim() || undefined,
      clubMember,
      clubPoints: clubMember ? totals.clubPoints : 0,
      itemsCount: activeItems.reduce((s, it) => s + it.quantity, 0),
      materialsSubtotal: totals.materialsSubtotal,
      installTotal: totals.installTotal,
      deliveryFee: totals.deliveryFee,
      pixDiscount: totals.pixDiscount,
      grandTotal: totals.grandTotal,
      pixPayload,
      createdAt: Date.now(),
    };

    window.setTimeout(() => {
      saveCompletedOrder(order);
      trackEvent({
        type: "checkout_completed",
        storeId,
        label: `Pedido ${order.code} (${fulfillmentLabel(order.fulfillment)} · ${paymentLabel(order.paymentMethod)} · ${formatBRL(order.grandTotal)})`,
        aisle: activeItems[0]?.aisle,
        painTopic: project.title,
      });
      setCompletedOrder(order);
      setProcessing(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 450);
  }

  function handleCopyPix() {
    if (!completedOrder) return;
    navigator.clipboard?.writeText(completedOrder.pixPayload).catch(() => {});
    setPixCopied(true);
    window.setTimeout(() => setPixCopied(false), 2500);
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col bg-floor">
        <StoreBar />
        <div className="flex flex-1 items-center justify-center text-[14px] text-signage-muted">
          Preparando seu checkout expresso…
        </div>
      </div>
    );
  }

  const activeStore = getStoreById(storeId);
  const criticalOrWarnAlerts = (audit?.alerts ?? []).filter(
    (a) => a.severity === "critical" || a.severity === "warning"
  );

  // ================= TELA DE CONFIRMAÇÃO: PASSE DIGITAL DE SAÍDA =================
  if (completedOrder) {
    return <OrderConfirmation completedOrder={completedOrder} pixCopied={pixCopied} onCopyPix={handleCopyPix} />;
  }

  // ================= FLUXO DE CHECKOUT EXPRESSO =================
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-floor">
      <StoreBar />

      {/* Topo enxuto com stepper de 3 passos */}
      <section className="border-b border-rule bg-white">
        <div className="container-wide py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/lista?id=${encodeURIComponent(project.id)}`}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-signage-muted transition hover:text-signage"
              >
                <ArrowLeftIcon size={14} />
                Voltar para a lista
              </Link>
              <h1 className="mt-1 font-display text-[22px] font-extrabold tracking-tight text-signage sm:text-[28px]">
                Checkout Expresso · {activeStore.shortName}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold sm:gap-2 sm:text-[12px]">
              <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full bg-leroy-soft px-2.5 py-1 text-leroy-deep sm:px-3">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-leroy-cta text-[10px] text-white">
                  1
                </span>
                Retirada
              </span>
              <span className="text-rule-strong">›</span>
              <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full bg-leroy-soft px-2.5 py-1 text-leroy-deep sm:px-3">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-leroy-cta text-[10px] text-white">
                  2
                </span>
                Pagamento
              </span>
              <span className="text-rule-strong">›</span>
              <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full bg-floor px-2.5 py-1 text-signage-subtle sm:px-3">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rule-strong text-[10px] text-white">
                  3
                </span>
                Passe QR
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="container-wide flex-1 py-6">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* COLUNA PRINCIPAL (7 cols) */}
          <div className="min-w-0 space-y-5 lg:col-span-7">
            {/* Pré-auditoria inteligente anti-2ª viagem */}
            {criticalOrWarnAlerts.length === 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-leroy/40 bg-leroy-soft/60 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5 text-[13px] font-semibold text-leroy-deep">
                  <ShieldCheckIcon size={18} className="flex-shrink-0 text-leroy-cta" />
                  <span>
                    Lista auditada: todas as peças combinam — zero chance de voltar à loja.
                  </span>
                </div>
                <span className="hidden flex-shrink-0 whitespace-nowrap rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-leroy-deep sm:inline">
                  {audit?.score ?? 100}% OK
                </span>
              </div>
            ) : (
              <div className="space-y-2 rounded-2xl border border-amberwarn/40 bg-amberwarn-soft/70 p-4">
                <div className="text-[13px] font-bold text-signage">
                  Antes de pagar, confira {criticalOrWarnAlerts.length}{" "}
                  {criticalOrWarnAlerts.length === 1 ? "item que faltou" : "itens que faltaram"}:
                </div>
                {criticalOrWarnAlerts.map((al) => (
                  <div
                    key={al.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 text-[12.5px]"
                  >
                    <span className="font-medium text-signage">{al.title}</span>
                    {al.fixLabel && al.fixType === "add_product" && (
                      <button
                        type="button"
                        onClick={() => applyQuickAuditFix(al)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-signage px-3 py-1 text-[12px] font-semibold text-white hover:bg-signage-soft"
                      >
                        <PlusIcon size={12} />
                        {al.fixLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* BLOCO 1: COMO VOCÊ QUER LEVAR? */}
            <section className="panel p-5">
              <h2 className="font-display text-[17px] font-extrabold text-signage">
                1. Como você quer levar?
              </h2>
              <p className="mt-0.5 text-[12.5px] text-signage-muted">
                Escolha sair direto da loja sem fila, retirar separado ou receber em casa.
              </p>

              <div className="mt-4 space-y-2.5">
                <FulfillmentOption
                  selected={fulfillment === "scan_and_go"}
                  onSelect={() => setFulfillment("scan_and_go")}
                  badge="Sem fila"
                  title="Pagar no celular e sair agora"
                  subtitle={`Itens já no seu carrinho · libera Passe QR na saída da ${activeStore.shortName}`}
                  priceLabel="Grátis"
                />

                <FulfillmentOption
                  selected={fulfillment === "clique_retire"}
                  onSelect={() => setFulfillment("clique_retire")}
                  badge={totals.hasHeavyItems ? "Drive-Thru disponível" : "30 min"}
                  title={
                    totals.hasHeavyItems
                      ? "Clique & Retire ou Drive-Thru Construção"
                      : "Clique & Retire Expresso na loja"
                  }
                  subtitle={
                    totals.hasHeavyItems
                      ? "Detectamos itens volumosos/pesados — separamos e colocamos direto no porta-malas."
                      : "Nossa equipe separa tudo para você retirar pronto no balcão."
                  }
                  priceLabel="Grátis"
                />

                <FulfillmentOption
                  selected={fulfillment === "entrega"}
                  onSelect={() => setFulfillment("entrega")}
                  badge="Mesmo dia"
                  title={`Entrega expressa em ${activeStore.city}`}
                  subtitle={
                    totals.freeDeliveryUnlocked
                      ? "Frete grátis desbloqueado em compras acima de R$ 299!"
                      : "Grátis acima de R$ 299 · entrega hoje ou amanhã"
                  }
                  priceLabel={
                    totals.freeDeliveryUnlocked
                      ? "Grátis"
                      : formatBRL(STANDARD_DELIVERY_FEE)
                  }
                />
              </div>

              {/* Campos enxutos somente se escolher Entrega */}
              {fulfillment === "entrega" && (
                <div className="mt-4 grid gap-3 rounded-xl border border-rule bg-floor/70 p-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-signage-muted">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-rule-strong bg-white px-3 text-[13.5px] text-signage outline-none focus:border-leroy-cta"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11.5px] font-semibold text-signage-muted">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-rule-strong bg-white px-3 text-[13.5px] text-signage outline-none focus:border-leroy-cta"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-semibold text-signage-muted">
                      Número / Apto
                    </label>
                    <input
                      type="text"
                      value={addressNumber}
                      onChange={(e) => setAddressNumber(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-rule-strong bg-white px-3 text-[13.5px] text-signage outline-none focus:border-leroy-cta"
                    />
                  </div>
                </div>
              )}

              {/* Agendamento rápido quando Leroy Merlin Instala está ativo */}
              {includeInstall && installService && (
                <div className="mt-4 rounded-xl border border-leroy/40 bg-leroy-soft/45 p-4">
                  <div className="flex items-center gap-2 text-[13px] font-bold text-signage">
                    <WrenchIcon size={15} className="text-leroy-cta" />
                    Agendar visita · {installService.title.replace("Leroy Merlin Instala · ", "")}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {INSTALL_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setInstallSlot(slot)}
                        className={`min-h-[38px] rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
                          installSlot === slot
                            ? "bg-leroy-cta text-white"
                            : "border border-rule bg-white text-signage-muted hover:text-signage"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* BLOCO 2: PAGAMENTO SEM BUROCRACIA */}
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-[17px] font-extrabold text-signage">
                    2. Pagamento
                  </h2>
                  <p className="mt-0.5 text-[12.5px] text-signage-muted">
                    Sem cadastro obrigatório · aprovação instantânea
                  </p>
                </div>
                <span className="rounded-full bg-floor px-2.5 py-1 text-[11px] font-semibold text-signage-subtle">
                  Modo demonstrativo
                </span>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                <PaymentTile
                  selected={paymentMethod === "pix"}
                  onSelect={() => setPaymentMethod("pix")}
                  title="Pix Instantâneo"
                  highlight="5% OFF"
                  detail="Liberação na hora"
                />
                <PaymentTile
                  selected={paymentMethod === "cartao"}
                  onSelect={() => setPaymentMethod("cartao")}
                  title="Cartão de Crédito"
                  highlight={`Até ${totals.installments.length}× s/ juros`}
                  detail="Parcelamento no app"
                />
                <PaymentTile
                  selected={paymentMethod === "totem"}
                  onSelect={() => setPaymentMethod("totem")}
                  title="Totem / Celebre"
                  highlight="Sem fila"
                  detail="Encoste na saída"
                />
              </div>

              {paymentMethod === "pix" && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-leroy-soft/60 px-4 py-3 text-[13px] text-leroy-deep">
                  <span>
                    Você economiza <strong>{formatBRL(totals.pixDiscount)}</strong> pagando no Pix. O QR Code e o Passe de Saída aparecem no próximo passo.
                  </span>
                </div>
              )}

              {paymentMethod === "cartao" && (
                <div className="mt-4 space-y-3 rounded-xl border border-rule bg-floor/60 p-4">
                  <label className="block text-[12px] font-semibold text-signage">
                    Parcelas sem juros
                  </label>
                  <select
                    value={installmentCount}
                    onChange={(e) => setInstallmentCount(Number(e.target.value))}
                    className="h-11 w-full rounded-xl border border-rule-strong bg-white px-3 text-[13.5px] font-medium text-signage outline-none focus:border-leroy-cta"
                  >
                    {totals.installments.map((opt) => (
                      <option key={opt.count} value={opt.count}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11.5px] text-signage-subtle">
                    Cartão simulado final <strong>•••• 4242</strong> (protótipo — não digite dados reais de cartão).
                  </p>
                </div>
              )}

              {paymentMethod === "totem" && (
                <div className="mt-4 rounded-xl border border-rule bg-floor/60 px-4 py-3 text-[12.5px] text-signage-muted">
                  Geramos um QR Code de pré-checkout para encostar seu Cartão Celebre, débito ou aproximação no Totem Expresso da saída.
                </div>
              )}

              {/* CPF opcional + Clube Leroy Merlin */}
              <div className="mt-4 grid gap-3 border-t border-rule pt-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[11.5px] font-semibold text-signage-muted">
                    CPF na Nota Fiscal (opcional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="mt-1 h-10 w-full rounded-xl border border-rule-strong bg-floor px-3 text-[13.5px] text-signage outline-none focus:border-leroy-cta focus:bg-white"
                  />
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-rule bg-floor/60 px-3.5 py-2.5">
                  <div>
                    <div className="text-[12.5px] font-bold text-signage">
                      Clube Leroy Merlin
                    </div>
                    <div className="text-[11.5px] text-leroy-deep">
                      +{totals.clubPoints} pontos nesta compra
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={clubMember}
                    onChange={(e) => setClubMember(e.target.checked)}
                    className="h-4 w-4 accent-[#65AA16]"
                  />
                </label>
              </div>
            </section>
          </div>

          {/* COLUNA LATERAL (5 cols): RESUMO FIXO LIMPO */}
          <aside className="min-w-0 lg:col-span-5">
            <div className="panel sticky top-20 p-5">
              <div className="flex items-center justify-between gap-2 border-b border-rule pb-3.5">
                <div>
                  <h2 className="font-display text-[17px] font-extrabold text-signage">
                    Resumo do pedido
                  </h2>
                  <p className="text-[12px] text-signage-muted">
                    {project.title} · {activeItems.length}{" "}
                    {activeItems.length === 1 ? "item" : "itens"}
                  </p>
                </div>
                <StoreIcon size={18} className="text-leroy-cta" />
              </div>

              {/* Lista enxuta de itens */}
              <ul className="mt-3 max-h-[260px] divide-y divide-rule overflow-y-auto pr-1">
                {activeItems.map((item) => (
                  <li key={item.productId} className="flex items-center gap-3 py-2.5">
                    <ProductThumb
                      src={item.imageUrl}
                      alt={item.name}
                      category={item.category}
                      size={52}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-signage">
                        {item.name}
                      </div>
                      <div className="text-[11.5px] text-signage-subtle">
                        {item.quantity}× · Corredor {item.corridorCode}
                      </div>
                    </div>
                    <span className="flex-shrink-0 font-mono text-[13px] font-bold text-signage">
                      {formatBRL(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Toggle rápido Leroy Merlin Instala */}
              {installService && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-rule bg-floor/70 px-3.5 py-2.5">
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-bold text-signage">
                      Leroy Merlin Instala
                    </div>
                    <div className="truncate text-[11px] text-signage-muted">
                      Garantia 12 meses · {formatBRL(installService.price)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeInstall((v) => !v)}
                    className={`min-h-[34px] flex-shrink-0 rounded-lg px-3 text-[12px] font-semibold transition ${
                      includeInstall
                        ? "bg-leroy-cta text-white"
                        : "border border-rule-strong bg-white text-signage hover:border-leroy"
                    }`}
                  >
                    {includeInstall ? "Incluído" : "+ Incluir"}
                  </button>
                </div>
              )}

              {/* Totais transparentes */}
              <div className="mt-4 space-y-2 border-t border-rule pt-4 text-[13.5px]">
                <div className="flex justify-between text-signage-muted">
                  <span>Materiais</span>
                  <span className="font-mono font-semibold text-signage">
                    {formatBRL(totals.materialsSubtotal)}
                  </span>
                </div>

                {totals.installTotal > 0 && (
                  <div className="flex justify-between text-signage-muted">
                    <span>Leroy Merlin Instala</span>
                    <span className="font-mono font-semibold text-signage">
                      {formatBRL(totals.installTotal)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-signage-muted">
                  <span>{fulfillment === "entrega" ? "Frete expresso" : "Retirada na loja"}</span>
                  <span
                    className={`font-mono font-semibold ${
                      totals.deliveryFee === 0 ? "text-leroy-deep" : "text-signage"
                    }`}
                  >
                    {totals.deliveryFee === 0 ? "Grátis" : formatBRL(totals.deliveryFee)}
                  </span>
                </div>

                {totals.pixDiscount > 0 && (
                  <div className="flex justify-between text-leroy-deep">
                    <span className="font-medium">Desconto Pix (5%)</span>
                    <span className="font-mono font-bold">
                      −{formatBRL(totals.pixDiscount)}
                    </span>
                  </div>
                )}

                <div className="flex items-baseline justify-between border-t border-rule pt-3">
                  <span className="font-display text-[15px] font-bold text-signage">
                    Total
                  </span>
                  <div className="text-right">
                    <div className="font-mono text-[24px] font-extrabold leading-none text-signage">
                      {formatBRL(totals.grandTotal)}
                    </div>
                    {paymentMethod === "cartao" && installmentCount > 1 && (
                      <div className="mt-1 text-[11.5px] text-signage-muted">
                        ou {installmentCount}× de{" "}
                        {formatBRL(totals.grandTotal / installmentCount)} sem juros
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={processing || activeItems.length === 0}
                onClick={handleConfirmOrder}
                className="btn-accent mt-5 w-full !py-3.5 !text-[14.5px]"
              >
                {processing ? (
                  <span>Gerando Passe Digital…</span>
                ) : (
                  <>
                    <span>
                      {fulfillment === "scan_and_go"
                        ? "Finalizar e gerar Passe de Saída"
                        : "Confirmar pedido"}
                    </span>
                    <ArrowRightIcon size={16} />
                  </>
                )}
              </button>

              <p className="mt-2.5 text-center text-[11px] text-signage-subtle">
                Compra protegida · troca fácil em qualquer loja Leroy Merlin
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
