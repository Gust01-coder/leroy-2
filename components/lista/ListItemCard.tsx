import type { Dispatch, SetStateAction } from "react";
import { ProductThumb } from "@/components/ProductThumb";
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon, RadioIcon, RefreshIcon } from "@/components/Icons";
import { formatBRL } from "@/lib/format";
import type { ProjectItem } from "@/lib/types";

type Props = {
  item: ProjectItem;
  isChecked: boolean;
  isOptionalExcluded: boolean;
  /** Só dá para remover um item se a lista ficar com ao menos um. */
  canRemove: boolean;
  onToggleChecked: (item: ProjectItem) => void;
  onRemove: (productId: string) => void;
  onOpenEsl: (item: ProjectItem) => void;
  onChangeQty: (productId: string, delta: number) => void;
  onSubstitute: (item: ProjectItem) => void;
  setIncludedOptionals: Dispatch<SetStateAction<Record<string, boolean>>>;
};

/** Cartão de um produto da lista: coleta, localização, quantidade, ESL e substituto. */
export function ListItemCard({
  item,
  isChecked,
  isOptionalExcluded,
  canRemove,
  onToggleChecked,
  onRemove,
  onOpenEsl,
  onChangeQty,
  onSubstitute,
  setIncludedOptionals,
}: Props) {
  return (
  <div
    className={`rounded-xl border bg-white p-3.5 transition ${
      isChecked
        ? "border-leroy bg-leroy-soft/20"
        : isOptionalExcluded
        ? "border-rule opacity-70"
        : "border-rule"
    }`}
  >
    <div className="flex flex-wrap items-center gap-3.5 sm:flex-nowrap">
      {!isOptionalExcluded && (
        <button
          type="button"
          onClick={() => onToggleChecked(item)}
          aria-label={`Marcar ${item.name} como coletado`}
          aria-pressed={isChecked}
          className={`relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded border-2 transition before:absolute before:-inset-2.5 before:content-[''] ${
            isChecked
              ? "border-leroy bg-leroy text-signage"
              : "border-rule-strong bg-white hover:border-signage"
          }`}
        >
          {isChecked && <CheckIcon size={12} strokeWidth={3} />}
        </button>
      )}

      <ProductThumb
        src={item.imageUrl}
        alt={item.name}
        category={item.category}
        size={76}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10.5px]">
          <span className="font-mono font-bold uppercase text-signage-subtle">
            {item.brand}
          </span>
          {item.optional && (
            <span className="rounded bg-floor px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-signage-muted">
              Opcional
            </span>
          )}
        </div>

        <div
          className={`mt-0.5 text-[14.5px] font-bold leading-snug ${
            isChecked
              ? "text-signage-subtle line-through"
              : "text-signage"
          }`}
        >
          {item.name}
        </div>

        {item.reason && (
          <div className="mt-0.5 text-[12px] text-signage-muted">{item.reason}</div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-signage-muted">
          <span className="font-mono font-bold text-signage">
            {item.corridorCode ?? item.aisle}
          </span>
          <span>·</span>
          <span>{item.shelfLocation}</span>
          <span>·</span>
          <span
            className={
              !item.inStock
                ? "font-semibold text-danger"
                : item.stockQty <= 6
                ? "font-semibold text-amberwarn"
                : "text-leroy-deep"
            }
          >
            {item.inStock ? `${item.stockQty} un.` : "Sem estoque"}
          </span>
        </div>
      </div>

      {/* Preço + Ações à direita */}
      <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-shrink-0 sm:flex-col sm:items-end">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[15px] font-extrabold tabular-nums text-signage">
            {formatBRL(item.price * item.quantity)}
          </span>
          {!item.optional && canRemove && (
            <button
              type="button"
              onClick={() => onRemove(item.productId)}
              title="Remover item"
              aria-label={`Remover ${item.name}`}
              className="rounded p-2 text-signage-muted transition hover:bg-danger-soft hover:text-danger"
            >
              <CloseIcon size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {item.inStock && (
            <button
              type="button"
              onClick={() => onOpenEsl(item)}
              title="Acender a etiqueta do produto na prateleira"
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-leroy/60 bg-leroy-soft px-3 text-[12.5px] font-bold text-leroy-deep transition hover:bg-leroy hover:text-signage"
            >
              <RadioIcon size={14} />
              Localizar
            </button>
          )}

          {item.optional ? (
            <button
              type="button"
              onClick={() =>
                setIncludedOptionals((prev) => ({
                  ...prev,
                  [item.productId]: !prev[item.productId],
                }))
              }
              className={`h-10 rounded-md px-3 text-[12.5px] font-semibold transition ${
                isOptionalExcluded
                  ? "bg-signage text-white"
                  : "bg-leroy-soft text-leroy-deep"
              }`}
            >
              {isOptionalExcluded ? "+ Incluir" : "Incluído"}
            </button>
          ) : (
            <div className="inline-flex h-10 items-center rounded-md border border-rule bg-floor">
              <button
                type="button"
                onClick={() => onChangeQty(item.productId, -1)}
                aria-label={`Diminuir quantidade de ${item.name}`}
                className="flex h-10 w-10 items-center justify-center text-signage-muted hover:text-signage"
              >
                <MinusIcon size={14} />
              </button>
              <span className="min-w-[20px] text-center font-mono text-[13px] font-bold text-signage">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => onChangeQty(item.productId, 1)}
                aria-label={`Aumentar quantidade de ${item.name}`}
                className="flex h-10 w-10 items-center justify-center text-signage-muted hover:text-signage"
              >
                <PlusIcon size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Substituto em 1 clique se sem estoque */}
    {!item.inStock && item.substituteName && (
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amberwarn-soft px-3 py-2 text-[12px]">
        <span className="text-signage">
          <strong className="text-amberwarn">Substituto:</strong>{" "}
          {item.substituteName} ({formatBRL(item.substitutePrice ?? 0)})
        </span>
        <button
          type="button"
          onClick={() => onSubstitute(item)}
          className="inline-flex items-center gap-1 rounded-md bg-signage px-2.5 py-1 text-[11.5px] font-semibold text-leroy"
        >
          <RefreshIcon size={11} />
          Trocar
        </button>
      </div>
    )}
  </div>
  );
}
