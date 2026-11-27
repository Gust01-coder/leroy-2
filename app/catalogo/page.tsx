"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StoreBar } from "@/components/StoreBar";
import { ProductCardMedia } from "@/components/ProductThumb";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { VoiceButton } from "@/components/VoiceButton";
import { EslShelfModal } from "@/components/EslShelfModal";
import {
  ArrowRightIcon,
  CheckIcon,
  MapIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/Icons";
import { semanticSearchCatalog } from "@/lib/semanticSearch";
import { materializeProjectItems } from "@/lib/projects";
import { getStoreById } from "@/lib/stores";
import {
  getSelectedStoreId,
  saveDynamicProject,
  trackEvent,
} from "@/lib/telemetry";
import { DynamicProjectList, Product, ProjectItem } from "@/lib/types";

const CATEGORIES = [
  "Todos",
  "Hidráulica",
  "Tintas",
  "Ferramentas",
  "Fixação",
  "Elétrica",
  "Materiais Básicos",
  "Limpeza",
];

const QUICK_HINTS = [
  "borrachinha da torneira",
  "bucha drywall",
  "chuveiro 220v",
  "tinta azul",
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CatalogoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-floor" />}>
      <CatalogoInner />
    </Suspense>
  );
}

function CatalogoInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const initialCatParam = params.get("cat") ?? "Todos";
  const initialCat = CATEGORIES.includes(initialCatParam) ? initialCatParam : "Todos";

  const [storeId, setStoreId] = useState("es-vitoria");
  const [query, setQuery] = useState(initialQ);
  const [category, setCategory] = useState(initialCat);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailTarget, setDetailTarget] = useState<{
    product: Product;
    stockQty: number;
  } | null>(null);
  const [eslTarget, setEslTarget] = useState<
    Pick<
      ProjectItem,
      "productId" | "name" | "sku" | "price" | "aisle" | "shelfLocation" | "stockQty"
    > | null
  >(null);

  useEffect(() => {
    setStoreId(getSelectedStoreId());
    const handler = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) setStoreId(next);
    };
    window.addEventListener("lm:store-changed", handler);
    return () => window.removeEventListener("lm:store-changed", handler);
  }, []);

  const matches = useMemo(
    () =>
      semanticSearchCatalog(query, storeId, {
        category,
        onlyInStock,
        limit: 100,
      }),
    [query, storeId, category, onlyInStock]
  );

  function applyQueryAndTrack(q: string) {
    setQuery(q);
    setCategory("Todos");
    const top = semanticSearchCatalog(q, storeId, { limit: 1 })[0];
    trackEvent({
      type: "semantic_search",
      storeId,
      label: `Busca semântica: "${q}" → ${top?.product.name ?? "catálogo"}`,
      aisle: top?.product.aisle,
      painTopic: top?.product.category || "Busca Semântica",
      unmet: top ? undefined : q.slice(0, 80),
    });
  }

  function toggleProduct(product: Product) {
    setSelectedIds((prev) =>
      prev.includes(product.id)
        ? prev.filter((id) => id !== product.id)
        : [...prev, product.id]
    );
  }

  function openEslFor(product: Product, stockQty: number) {
    setEslTarget({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      aisle: product.aisle,
      shelfLocation: product.shelfLocation,
      stockQty,
    });
  }

  function buildCustomList(target: "lista" | "mapa" | "checkout") {
    if (selectedIds.length === 0) return;
    const id = `catalogo-${Date.now().toString(36)}`;
    const items = materializeProjectItems(
      selectedIds.map((productId) => ({ productId, quantity: 1 })),
      storeId
    );
    const project: DynamicProjectList = {
      id,
      title: query.trim()
        ? `Projeto: ${query.trim().slice(0, 32)}`
        : "Minha lista de corredor",
      subtitle: `${items.length} ${items.length === 1 ? "item" : "itens"} selecionados no catálogo`,
      description:
        "Lista personalizada com auditoria de compatibilidade, estoque da unidade e rota pelos corredores.",
      storeId,
      difficulty: "Fácil",
      estimatedInstallMin: 20,
      sourceIntent: "catalogo",
      items,
      tutorial: [
        {
          step: 1,
          title: "Ache cada item pela etiqueta que acende",
          detail:
            "No corredor indicado, toque em 'Localizar' para acender o LED verde na prateleira exata.",
          durationMin: 4,
        },
        {
          step: 2,
          title: "Revise a Auditoria Anti-Segunda Viagem antes do caixa",
          detail:
            "Confirme se nenhum consumível essencial de vedação, fixação ou segurança ficou de fora.",
          durationMin: 2,
        },
      ],
      createdAt: Date.now(),
    };
    saveDynamicProject(project);
    trackEvent({
      type: "list_generated",
      storeId,
      label: `Lista personalizada via catálogo (${items.length} itens)`,
      aisle: items[0]?.aisle,
      painTopic: "Busca Semântica",
    });
    router.push(`/${target}?id=${encodeURIComponent(project.id)}`);
  }

  const activeStore = getStoreById(storeId);

  return (
    <div className="flex min-h-screen flex-col bg-floor">
      <StoreBar />

      {/* Cabeçalho enxuto e respirável */}
      <section className="border-b border-rule bg-white">
        <div className="container-wide py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-display text-[24px] font-extrabold tracking-tight text-signage sm:text-[28px]">
              Catálogo · {activeStore.shortName}
            </h1>
            <span className="font-mono text-[11.5px] text-signage-subtle">
              {matches.length} {matches.length === 1 ? "produto" : "produtos"}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-signage-subtle">
            Produtos, códigos e fotos do site da Leroy Merlin. Preços de referência; estoque e corredor ilustrativos.
          </p>

          {/* Barra de busca + voz */}
          <div className="mt-3.5 flex gap-2">
            <div className="relative flex flex-1 items-center">
              <SearchIcon
                size={16}
                className="pointer-events-none absolute left-3.5 text-signage-subtle"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && query.trim()) {
                    applyQueryAndTrack(query.trim());
                  }
                }}
                placeholder="Busque pelo nome ou descreva com suas palavras…"
                className="h-11 w-full rounded-lg border border-rule-strong bg-floor pl-10 pr-4 text-[14px] text-signage outline-none transition focus:border-signage focus:bg-white"
              />
            </div>

            <VoiceButton
              onTranscript={(transcript) => applyQueryAndTrack(transcript)}
            />
          </div>

          {/* Sugestões discretas em texto simples (sem poluição de caixas) */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-signage-subtle">
            <span>Exemplos:</span>
            {QUICK_HINTS.map((hint, idx) => (
              <span key={hint} className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyQueryAndTrack(hint)}
                  className="underline decoration-rule-strong underline-offset-2 transition hover:text-signage"
                >
                  {hint}
                </button>
                {idx < QUICK_HINTS.length - 1 && (
                  <span className="text-rule-strong">·</span>
                )}
              </span>
            ))}
          </div>

          {/* Filtros em linha única */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-rule/80 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition ${
                    category === cat
                      ? "bg-leroy-cta text-white shadow-sm"
                      : "bg-floor text-signage-muted hover:bg-floor-deep hover:text-signage"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-medium text-signage-muted">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="h-3.5 w-3.5 accent-[#78BE20]"
              />
              Somente em estoque
            </label>
          </div>
        </div>
      </section>

      {/* Grade de produtos limpa (4 elementos por card + detalhes sob demanda no modal) */}
      <main className="container-wide flex-1 py-6">
        {selectedIds.length > 0 && (
          <div className="mb-4 flex items-center justify-between text-[12.5px] text-signage-muted">
            <span>
              <strong className="text-signage">{selectedIds.length}</strong>{" "}
              {selectedIds.length === 1 ? "item na seleção" : "itens na seleção"}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-[12px] font-medium text-signage-subtle hover:text-signage"
            >
              Limpar seleção
            </button>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="panel p-12 text-center">
            <p className="font-display text-[18px] font-bold text-signage">
              Nenhum produto encontrado.
            </p>
            <p className="mt-1 text-[13.5px] text-signage-muted">
              Tente outro termo ou descreva o problema no Copiloto por voz ou foto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 pb-24 md:grid-cols-3 lg:grid-cols-4">
            {matches.map(({ product, stockQty, inStock }) => {
              const selected = selectedIds.includes(product.id);
              return (
                <article
                  key={product.id}
                  className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-card transition duration-200 ${
                    selected
                      ? "border-leroy-cta ring-2 ring-leroy/35"
                      : "border-rule/80 hover:-translate-y-0.5 hover:border-leroy/60 hover:shadow-card-hover"
                  }`}
                >
                  {/* 1. Foto full-bleed 4:3 (clique abre detalhes técnicos e ESL) */}
                  <button
                    type="button"
                    onClick={() => setDetailTarget({ product, stockQty })}
                    className="relative block w-full text-left focus:outline-none"
                    aria-label={`Ver detalhes de ${product.name}`}
                  >
                    <ProductCardMedia
                      src={product.imageUrl}
                      alt={product.name}
                      category={product.category}
                    />

                    {/* Apenas 1 selo discreto de corredor */}
                    <span className="aisle-plate absolute left-2.5 top-2.5 !px-1.5 !py-0.5 !text-[10px] shadow-sm">
                      {product.corridorCode}
                    </span>

                    {!inStock && (
                      <span className="absolute right-2.5 top-2.5 rounded bg-danger px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase text-white shadow-sm">
                        Sem estoque
                      </span>
                    )}
                  </button>

                  {/* 2. Conteúdo enxuto (Marca + Título + Preço + Ação) */}
                  <div className="flex flex-1 flex-col justify-between p-3.5">
                    <button
                      type="button"
                      onClick={() => setDetailTarget({ product, stockQty })}
                      className="text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-1.5 text-[10.5px]">
                        <span className="font-mono font-bold uppercase tracking-wider text-signage-subtle">
                          {product.brand}
                        </span>
                        {product.leroyExclusive && (
                          <span className="font-mono text-[9.5px] font-semibold text-leroy-deep">
                            · Exclusivo
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-signage transition group-hover:text-leroy-deep">
                        {product.name}
                      </h3>
                    </button>

                    <div className="mt-3.5 flex items-end justify-between gap-2 border-t border-rule/70 pt-3">
                      <div>
                        <div className="font-mono text-[15.5px] font-extrabold leading-none tabular-nums text-signage">
                          {formatBRL(product.price)}
                        </div>
                        <div
                          className={`mt-1 text-[11px] font-medium ${
                            !inStock
                              ? "text-danger"
                              : stockQty <= 6
                              ? "text-amberwarn"
                              : "text-signage-subtle"
                          }`}
                        >
                          {!inStock
                            ? "Indisponível"
                            : stockQty <= 6
                            ? `Últimas ${stockQty} un.`
                            : `${stockQty} em estoque`}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleProduct(product)}
                        className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[12px] font-semibold transition ${
                          selected
                            ? "bg-leroy-cta text-white shadow-sm"
                            : "bg-floor text-signage hover:bg-leroy-cta hover:text-white"
                        }`}
                      >
                        {selected ? (
                          <>
                            <CheckIcon size={13} strokeWidth={2.5} />
                            <span>Lista</span>
                          </>
                        ) : (
                          <>
                            <PlusIcon size={13} />
                            <span>Lista</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Barra flutuante de ação quando há itens selecionados */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-30 px-4">
          <div className="mx-auto flex max-w-[660px] flex-wrap items-center justify-between gap-3 rounded-xl border border-leroy bg-signage px-4 py-3 text-white shadow-2xl">
            <div className="text-[13.5px] font-semibold">
              {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "produto selecionado" : "produtos selecionados"}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => buildCustomList("lista")}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-white/25"
              >
                Abrir Lista
              </button>
              <button
                type="button"
                onClick={() => buildCustomList("mapa")}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-white/25"
              >
                <MapIcon size={13} />
                Rota 2D
              </button>
              <button
                type="button"
                onClick={() => buildCustomList("checkout")}
                className="btn-accent !min-h-[40px] !px-4 !py-2 !text-[12.5px]"
              >
                Checkout
                <ArrowRightIcon size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progressive Disclosure: Modal de Detalhes Técnicos + ESL */}
      <ProductDetailModal
        product={detailTarget?.product ?? null}
        storeName={activeStore.shortName}
        stockQty={detailTarget?.stockQty ?? 0}
        selected={
          detailTarget ? selectedIds.includes(detailTarget.product.id) : false
        }
        onClose={() => setDetailTarget(null)}
        onToggleSelect={toggleProduct}
        onOpenEsl={openEslFor}
      />

      <EslShelfModal
        item={eslTarget}
        storeId={storeId}
        onClose={() => setEslTarget(null)}
      />
    </div>
  );
}
