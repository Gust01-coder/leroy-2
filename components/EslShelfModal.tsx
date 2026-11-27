"use client";

import { useEffect, useMemo, useState } from "react";
import { CloseIcon, MapPinIcon, RadioIcon } from "./Icons";
import { ProductThumb } from "./ProductThumb";
import { buildEslPlanogram } from "@/lib/store/eslPlanogram";
import { trackEvent } from "@/lib/telemetry";
import { ProjectItem } from "@/lib/types";
import { corridorOf } from "@/lib/store/storeMap";
import { useDialog } from "./useDialog";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function MicroBarcode({ className = "h-3.5 w-16" }: { className?: string }) {
  const bars = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 1, 3, 1, 2];
  let x = 0;
  return (
    <svg viewBox="0 0 64 14" className={className} aria-hidden="true">
      {bars.map((w, idx) => {
        const curX = x;
        x += w + 1.1;
        return idx % 2 === 0 ? (
          <rect key={idx} x={curX} y={0} width={w} height={14} fill="currentColor" />
        ) : null;
      })}
    </svg>
  );
}

/**
 * Etiqueta eletrônica E-Ink (ESL) tátil com foto real do produto + LED Pick-to-Light acionável.
 */
export function EslTagCard({
  name,
  brand,
  imageUrl,
  category = "Hidráulica",
  sku,
  price,
  aisle,
  shelfLocation,
  stockQty,
  blinking,
  onToggleBlink,
}: {
  name: string;
  brand?: string;
  imageUrl?: string;
  category?: string;
  sku: string;
  price: number;
  aisle: string;
  shelfLocation: string;
  stockQty: number;
  blinking: boolean;
  onToggleBlink?: () => void;
}) {
  return (
    <div
      className={`relative rounded-lg border-2 p-3 transition ${
        blinking
          ? "border-leroy bg-eink shadow-[0_0_0_2px_rgba(120,190,32,0.28)]"
          : "border-eink-border bg-eink"
      }`}
    >
      <div className="flex items-center justify-between gap-2 border-b border-eink-border pb-1.5">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full border border-signage/30 ${
              blinking ? "animate-esl-blink bg-leroy-glow" : "bg-signage/20"
            }`}
          />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-eink-ink">
            ESL · {corridorOf(aisle)}
          </span>
        </div>

        <span
          className={`font-mono text-[9.5px] font-bold uppercase ${
            blinking ? "text-leroy-deep" : "text-signage-subtle"
          }`}
        >
          {blinking ? "● PISCANDO NA PRATELEIRA" : "E-INK PRONTO"}
        </span>
      </div>

      <div className="mt-2.5 flex items-center gap-3">
        {imageUrl && (
          <ProductThumb
            src={imageUrl}
            alt={name}
            category={category}
            size={54}
            className="border-eink-border"
          />
        )}

        <div className="min-w-0 flex-1">
          {brand && (
            <div className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-signage-subtle">
              {brand}
            </div>
          )}
          <div className="line-clamp-2 font-display text-[13px] font-bold leading-tight text-eink-ink">
            {name}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-signage-muted">
            {shelfLocation} · {stockQty} un.
          </div>
          <div className="mt-1 flex items-center gap-2 text-eink-ink/75">
            <MicroBarcode className="h-3 w-12" />
            <span className="font-mono text-[9px]">{sku}</span>
          </div>
        </div>

        <div className="flex-shrink-0 rounded bg-eink-ink px-2 py-1.5 text-right text-white">
          <div className="font-mono text-[14.5px] font-bold leading-none tabular-nums">
            {formatBRL(price)}
          </div>
        </div>
      </div>

      {onToggleBlink && (
        <button
          type="button"
          onClick={onToggleBlink}
          className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider transition ${
            blinking
              ? "bg-signage text-leroy"
              : "bg-leroy text-signage hover:bg-leroy-dark hover:text-white"
          }`}
        >
          <RadioIcon size={13} />
          {blinking ? "Desligar LED da etiqueta" : "Piscar etiqueta na prateleira"}
        </button>
      )}
    </div>
  );
}

/**
 * Modal de Planograma da Gôndola com fotos reais em cada posição + etiqueta ESL piscando LED verde.
 */
export function EslShelfModal({
  item,
  storeId,
  onClose,
}: {
  item: Pick<
    ProjectItem,
    "productId" | "name" | "sku" | "price" | "aisle" | "shelfLocation" | "stockQty"
  > | null;
  storeId: string;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(45);
  const dialogRef = useDialog<HTMLDivElement>(!!item, onClose);

  const planogram = useMemo(() => {
    if (!item) return null;
    return buildEslPlanogram(item, storeId);
  }, [item, storeId]);

  useEffect(() => {
    if (!item) return;
    setCountdown(45);
    trackEvent({
      type: "esl_blink_triggered",
      storeId,
      label: `ESL Pick-to-Light acionado: ${item.name} (${item.aisle} · ${item.shelfLocation})`,
      aisle: item.aisle,
      productName: item.name,
    });

    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [item, storeId]);

  if (!item || !planogram) return null;

  const levels: (3 | 2 | 1)[] = [3, 2, 1];
  const levelNames: Record<3 | 2 | 1, string> = {
    3: "Prateleira 3 · Superior (Olhos)",
    2: "Prateleira 2 · Média (Cintura)",
    1: "Prateleira 1 · Base (Inferior)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-signage/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" tabIndex={-1}
        aria-label="Localizar o produto na prateleira"
        className="max-h-[92vh] w-full max-w-[660px] focus:outline-none animate-slide-up overflow-y-auto rounded-t-2xl border border-rule-strong bg-white shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-signage px-5 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <span className="h-3 w-3 animate-esl-blink rounded-full bg-leroy-glow" />
            <div>
              <div className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-leroy">
                ESL Pick-to-Light · Último Metro Ativo
              </div>
              <div className="font-display text-[15px] font-bold text-white">
                Corredor {corridorOf(planogram.aisle)} · {planogram.moduleLabel}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon size={17} />
          </button>
        </div>

        <div className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-leroy bg-leroy-soft px-3.5 py-2">
            <div className="flex items-start gap-2">
              <MapPinIcon size={16} className="mt-0.5 flex-shrink-0 text-leroy-deep" />
              <div>
                <div className="text-[12.5px] font-bold text-signage">
                  Procure a luz verde piscando na gôndola:
                </div>
                <div className="font-mono text-[10.5px] text-leroy-deep">
                  {planogram.eyeHeightNote} · {planogram.targetPositionLabel}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded bg-signage px-2 py-1 font-mono text-[10.5px] font-bold text-leroy">
                LED {countdown > 0 ? `${countdown}s` : "OFF"}
              </span>
              {countdown === 0 && (
                <button
                  type="button"
                  onClick={() => setCountdown(45)}
                  className="rounded bg-leroy px-2 py-1 font-mono text-[10.5px] font-bold text-signage"
                >
                  Piscar de novo
                </button>
              )}
            </div>
          </div>

          {/* Planograma metálico da gôndola com foto real de cada SKU */}
          <div className="mt-3 space-y-2 rounded-xl border-2 border-signage bg-[#202428] p-3">
            <div className="flex items-center justify-between px-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em] text-white/60">
              <span>Gôndola {corridorOf(planogram.aisle)} · {planogram.moduleLabel}</span>
              <span>Etiquetas Eletrônicas E-Ink (BLE)</span>
            </div>

            {levels.map((lvl) => {
              const rowSlots = planogram.slots.filter((s) => s.shelfLevel === lvl);
              const hasTarget = lvl === planogram.targetShelfLevel;

              return (
                <div
                  key={lvl}
                  className={`rounded-lg border p-2 ${
                    hasTarget
                      ? "border-leroy/80 bg-[#2A3128]"
                      : "border-white/10 bg-[#181B1F]"
                  }`}
                >
                  <div className="mb-1.5 flex items-center justify-between font-mono text-[9.5px] font-semibold uppercase tracking-wider">
                    <span className={hasTarget ? "text-leroy" : "text-white/45"}>
                      {levelNames[lvl]}
                    </span>
                    {hasTarget && (
                      <span className="rounded bg-leroy px-1.5 py-0.5 text-[8.5px] font-bold text-signage">
                        SEU PRODUTO AQUI
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {rowSlots.map((slot, idx) => (
                      <div
                        key={`${lvl}-${idx}`}
                        className={`rounded-md border p-1.5 transition ${
                          slot.isTarget
                            ? "border-2 border-leroy bg-eink ring-2 ring-leroy/40"
                            : "border-eink-border/40 bg-eink/70 opacity-65"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              slot.isTarget && countdown > 0
                                ? "animate-esl-blink bg-leroy-glow"
                                : "bg-signage/25"
                            }`}
                          />
                          <span className="font-mono text-[8.5px] font-bold text-signage-muted">
                            {slot.product.brand}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-1.5">
                          <ProductThumb
                            src={slot.product.imageUrl}
                            alt={slot.product.name}
                            category={slot.product.category}
                            size={34}
                            className="border-eink-border p-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 font-display text-[9.5px] font-bold leading-tight text-eink-ink">
                              {slot.product.name}
                            </div>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center justify-between border-t border-eink-border pt-1">
                          <span className="font-mono text-[8.5px] text-signage-muted">
                            {slot.stockQty} un.
                          </span>
                          <span className="rounded bg-eink-ink px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-white">
                            {formatBRL(slot.product.price)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] text-signage-subtle">
              Etiqueta eletrônica e-ink sincronizada com a posição exata na gôndola da unidade.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary flex-shrink-0 !py-2 !text-[12px]"
            >
              Encontrei o item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
