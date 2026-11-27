"use client";

import { Product } from "@/lib/types";
import { ProductCardMedia } from "./ProductThumb";
import { MicroBarcode } from "./EslShelfModal";
import { CheckIcon, CloseIcon, MapPinIcon, PlusIcon, RadioIcon } from "./Icons";
import { useDialog } from "./useDialog";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Progressive Disclosure: exibe detalhes técnicos (descrição, prateleira, SKU e acionamento ESL)
 * sob demanda, mantendo a grade do catálogo limpa e escaneável.
 */
export function ProductDetailModal({
  product,
  storeName,
  stockQty,
  selected,
  onClose,
  onToggleSelect,
  onOpenEsl,
}: {
  product: Product | null;
  storeName: string;
  stockQty: number;
  selected: boolean;
  onClose: () => void;
  onToggleSelect: (product: Product) => void;
  onOpenEsl: (product: Product, stockQty: number) => void;
}) {
  const dialogRef = useDialog<HTMLDivElement>(!!product, onClose);
  if (!product) return null;

  const inStock = stockQty > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-signage/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" tabIndex={-1}
        aria-label={product.name}
        className="max-h-[92vh] w-full max-w-[520px] focus:outline-none animate-slide-up overflow-y-auto rounded-t-2xl border border-rule-strong bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Foto full-bleed 16:10 para caber integralmente em telas 1280x800 sem rolagem */}
        <div className="relative">
          <ProductCardMedia
            src={product.imageUrl}
            alt={product.name}
            category={product.category}
            className="!aspect-[16/10] max-h-[245px]"
          />
          <span className="aisle-plate absolute left-3 top-3 shadow-sm">
            Corredor {product.corridorCode}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar detalhes"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-signage/80 text-white transition hover:bg-signage"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Conteúdo enxuto e bem hierarquizado */}
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-leroy-deep">
              {product.brand}
            </span>
            <span className="text-rule-strong">·</span>
            <span className="text-[12px] text-signage-subtle">
              {product.category}
            </span>
            {product.leroyExclusive && (
              <span className="rounded bg-leroy-soft px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase text-leroy-deep">
                Exclusivo Leroy
              </span>
            )}
          </div>

          <h2 className="mt-1.5 font-display text-[20px] font-extrabold leading-snug text-signage">
            {product.name}
          </h2>

          <p className="mt-2 text-[13.5px] leading-relaxed text-signage-muted">
            {product.description}
          </p>

          {/* Preço + Estoque */}
          <div className="mt-4 flex items-baseline justify-between border-y border-rule py-3.5">
            <div>
              <span className="font-mono text-[26px] font-extrabold tabular-nums text-signage">
                {formatBRL(product.price)}
              </span>
              <span className="ml-1.5 text-[12px] text-signage-subtle">
                / {product.unit}
              </span>
              <div className="text-[11px] text-signage-subtle">Preço de referência</div>
            </div>

            {inStock ? (
              <span className={stockQty <= 6 ? "badge-stock-low" : "badge-stock-ok"}>
                {stockQty <= 6 ? `Últimas ${stockQty} un.` : `${stockQty} un. em estoque`}
              </span>
            ) : (
              <span className="badge-stock-out">Sem estoque</span>
            )}
          </div>

          {/* Localização exata + SKU */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-lg bg-floor p-3">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-signage-subtle">
                <MapPinIcon size={12} className="text-leroy-dark" />
                Onde encontrar ({storeName})
              </div>
              <div className="mt-1 text-[13px] font-bold text-signage">
                Corredor {product.corridorCode}
              </div>
              <div className="text-[12px] text-signage-muted">
                {product.shelfLocation}
              </div>
            </div>

            <div className="rounded-lg bg-floor p-3">
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-signage-subtle">
                Código Leroy Merlin
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-signage">
                <MicroBarcode className="h-3.5 w-14" />
                <span className="font-mono text-[12px] font-bold">{product.sku}</span>
              </div>
              {product.url && (
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-[32px] items-center text-[12px] font-bold text-leroy-deep underline underline-offset-2"
                >
                  Ver no site da Leroy
                </a>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {inStock && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEsl(product, stockQty);
                }}
                className="btn-secondary flex-1 !py-2.5"
              >
                <RadioIcon size={15} className="text-leroy-dark" />
                Acender etiqueta na prateleira
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleSelect(product)}
              className={`flex-1 ${
                selected ? "btn-primary !py-2.5" : "btn-accent !py-2.5"
              }`}
            >
              {selected ? (
                <>
                  <CheckIcon size={15} strokeWidth={2.5} />
                  Selecionado na lista
                </>
              ) : (
                <>
                  <PlusIcon size={15} />
                  Adicionar à lista
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
