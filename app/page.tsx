"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StoreBar } from "@/components/StoreBar";
import { VoiceButton } from "@/components/VoiceButton";
import { ProductCardMedia } from "@/components/ProductThumb";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { EslShelfModal } from "@/components/EslShelfModal";
import {
  ArrowRightIcon,
  CameraIcon,
  ChartIcon,
  DropletIcon,
  LayersIcon,
  MapIcon,
  MapPinIcon,
  PaintbrushIcon,
  SearchIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "@/components/Icons";
import { CATALOG, getStockForStore } from "@/lib/catalog";
import { getStoreById } from "@/lib/stores";
import { getSelectedStoreId, getStoredTickets } from "@/lib/telemetry";
import { Product, ProjectItem } from "@/lib/types";

const QUICK_SCENARIOS = [
  {
    corridor: "C05",
    sector: "Hidráulica",
    title: "Vazamento ou torneira",
    hint: "Diagnóstico em 15s",
    prompt: "Minha torneira está pingando",
    Icon: DropletIcon,
  },
  {
    corridor: "C09",
    sector: "Tintas",
    title: "Pintar um cômodo",
    hint: "Calcula litros por m²",
    prompt: "Quero pintar um quarto azul de 3x4m",
    Icon: PaintbrushIcon,
  },
  {
    corridor: "C16",
    sector: "Fixação",
    title: "Instalar prateleira",
    hint: "Alvenaria ou drywall",
    prompt: "Quero instalar uma prateleira na parede",
    Icon: LayersIcon,
  },
  {
    corridor: "C19",
    sector: "Elétrica",
    title: "Chuveiro ou LED",
    hint: "Troca segura 220V",
    prompt: "Meu chuveiro parou de esquentar",
    Icon: ZapIcon,
  },
];

const FEATURED_PRODUCT_IDS = [
  "hid-torneira-mono",
  "fer-furadeira",
  "tin-acrilica-18l-azul",
  "ele-chuveiro-eletronico",
];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function StoreModeHomePage() {
  const router = useRouter();
  const [storeId, setStoreId] = useState("es-vitoria");
  const [command, setCommand] = useState("");
  const [openTickets, setOpenTickets] = useState(2);
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
    setOpenTickets(
      getStoredTickets().filter((t) => t.status !== "resolvido").length
    );

    const onStore = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) setStoreId(next);
    };
    window.addEventListener("lm:store-changed", onStore);
    return () => window.removeEventListener("lm:store-changed", onStore);
  }, []);

  function launchQuery(text: string, viaVoice = false) {
    const trimmed = text.trim();
    if (!trimmed) {
      router.push("/chat");
      return;
    }
    const qs = new URLSearchParams({ q: trimmed });
    if (viaVoice) qs.set("voice", "1");
    router.push(`/chat?${qs.toString()}`);
  }

  const activeStore = getStoreById(storeId);
  const featuredProducts = FEATURED_PRODUCT_IDS.map((id) =>
    CATALOG.find((p) => p.id === id)
  ).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <main className="flex flex-1 flex-col bg-floor">
      <StoreBar />

      {/* ===== HERO ENXUTO: FOCO TOTAL NA BUSCA MULTIMODAL ===== */}
      <section className="blueprint-grid border-b border-signage bg-signage text-white">
        <div className="container-wide py-8 md:py-10">
          <div className="flex items-center gap-2 font-mono text-[11px] text-white/70">
            <span className="h-2 w-2 rounded-full bg-leroy" />
            <MapPinIcon size={12} className="text-leroy" />
            <span className="truncate">
              {activeStore.name} · {activeStore.address}
            </span>
          </div>

          <h1 className="mt-3 max-w-[680px] font-display text-[30px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[40px]">
            O que você precisa resolver{" "}
            <span className="text-leroy">hoje na loja?</span>
          </h1>
          <p className="mt-2 max-w-[560px] text-[14.5px] text-white/65">
            Fale, digite do seu jeito ou fotografe a peça — encontramos o produto e o corredor exato.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              launchQuery(command, false);
            }}
            className="mt-5 flex max-w-[780px] flex-col gap-2 rounded-xl border border-white/15 bg-signage-soft p-2 sm:flex-row sm:items-center"
          >
            <div className="relative flex flex-1 items-center">
              <SearchIcon
                size={17}
                className="pointer-events-none absolute left-3.5 text-white/45"
              />
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Ex: torneira pingando"
                className="h-11 w-full rounded-lg bg-signage pl-10 pr-3 text-[14px] text-white outline-none ring-1 ring-white/10 transition placeholder:text-white/40 focus:ring-leroy"
              />
            </div>

            <div className="flex items-center gap-2">
              <VoiceButton
                onTranscript={(transcript) => launchQuery(transcript, true)}
              />

              <Link
                href="/chat?vision=1"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-signage px-3.5 text-[13px] font-semibold text-white transition hover:border-leroy hover:text-leroy"
              >
                <CameraIcon size={16} />
                <span>Foto</span>
              </Link>

              <button type="submit" className="btn-accent h-11 !px-5">
                <span>Resolver</span>
                <ArrowRightIcon size={15} />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ===== CONTEÚDO CALMO E ESCANEÁVEL (3 BLOCOS CLAROS) ===== */}
      <div className="container-wide space-y-9 py-8">
        {/* 1. Projetos rápidos em 4 cards */}
        <section>
          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="font-display text-[19px] font-extrabold text-signage">
              Comece pelo problema
            </h2>
            <Link
              href="/chat"
              className="text-[12.5px] font-semibold text-leroy-deep hover:underline"
            >
              Abrir assistente →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {QUICK_SCENARIOS.map(({ corridor, sector, title, hint, prompt, Icon }) => (
              <Link
                key={corridor}
                href={`/chat?q=${encodeURIComponent(prompt)}`}
                className="group flex flex-col justify-between rounded-xl border border-rule bg-white p-4 transition hover:border-leroy hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="aisle-plate">{corridor}</span>
                  <Icon
                    size={16}
                    className="text-signage-subtle transition group-hover:text-leroy-dark"
                  />
                </div>
                <div className="mt-4">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-signage-muted">
                    {sector}
                  </div>
                  <div className="mt-0.5 font-display text-[15px] font-bold leading-snug text-signage group-hover:text-leroy-deep">
                    {title}
                  </div>
                  <div className="mt-1 text-[12px] text-signage-muted">{hint}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 2. Destaques em estoque (mesmo padrão 4:3 limpo do catálogo) */}
        <section>
          <div className="mb-3.5 flex items-baseline justify-between">
            <h2 className="font-display text-[19px] font-extrabold text-signage">
              Em estoque em {activeStore.shortName}
            </h2>
            <Link
              href="/catalogo"
              className="text-[12.5px] font-semibold text-leroy-deep hover:underline"
            >
              Ver todos ({CATALOG.length}) →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featuredProducts.map((prod) => {
              const qty = getStockForStore(prod, storeId);
              return (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => setDetailTarget({ product: prod, stockQty: qty })}
                  className="group flex flex-col overflow-hidden rounded-xl border border-rule bg-white text-left transition hover:border-signage/35 hover:shadow-md"
                >
                  <div className="relative w-full">
                    <ProductCardMedia
                      src={prod.imageUrl}
                      alt={prod.name}
                      category={prod.category}
                    />
                    <span className="aisle-plate absolute left-2.5 top-2.5 !px-1.5 !py-0.5 !text-[10px] shadow-sm">
                      {prod.corridorCode}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-3.5">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10.5px]">
                        <span className="font-mono font-bold uppercase tracking-wider text-signage-muted">
                          {prod.brand}
                        </span>
                        {prod.leroyExclusive && (
                          <span className="font-mono text-[10.5px] font-semibold text-leroy-deep">
                            · Exclusivo
                          </span>
                        )}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-signage group-hover:text-leroy-deep">
                        {prod.name}
                      </div>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between border-t border-rule/70 pt-2.5">
                      <span className="font-mono text-[15px] font-extrabold tabular-nums text-signage">
                        {formatBRL(prod.price)}
                      </span>
                      <span className="text-[11px] font-medium text-signage-muted">
                        {qty} un.
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Atalhos operacionais (3 cards limpos lado a lado) */}
        <section className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/mapa?id=pintura-quarto"
            className="group flex items-center gap-3.5 rounded-xl border border-rule bg-white p-4 transition hover:border-signage/40"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-leroy-soft text-leroy-deep">
              <MapIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[14.5px] font-bold text-signage group-hover:text-leroy-deep">
                Mapa da loja e etiqueta que acende
              </div>
              <div className="text-[12px] text-signage-muted">
                Mapa de corredores de {activeStore.shortName}
              </div>
            </div>
          </Link>

          <Link
            href="/lista?id=instalar-prateleira"
            className="group flex items-center gap-3.5 rounded-xl border border-rule bg-white p-4 transition hover:border-signage/40"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amberwarn-soft text-amberwarn">
              <ShieldCheckIcon size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-display text-[14.5px] font-bold text-signage group-hover:text-leroy-deep">
                Exemplo de lista pronta
              </div>
              <div className="text-[12px] text-signage-muted">
                Peças que combinam, em 3 faixas de preço
              </div>
            </div>
          </Link>

          <Link
            href="/painel"
            className="group flex items-center justify-between gap-3 rounded-xl border border-signage bg-signage p-4 text-white transition hover:bg-signage-soft"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-leroy">
                <ChartIcon size={18} />
              </div>
              <div>
                <div className="font-display text-[14.5px] font-bold text-white">
                  Console do Vendedor
                </div>
                <div className="text-[12px] text-white/65">
                  Chamados, mapa de calor e dados
                </div>
              </div>
            </div>
            {openTickets > 0 && (
              <span className="flex-shrink-0 rounded-full bg-leroy px-2 py-0.5 font-mono text-[11px] font-extrabold text-signage">
                {openTickets}
              </span>
            )}
          </Link>
        </section>
      </div>

      <footer className="mt-auto border-t border-rule bg-white px-4 py-4">
        <div className="container-wide flex flex-wrap items-center justify-between gap-2 text-[12px] text-signage-subtle">
          <span>
            <strong className="font-semibold text-signage">LM Copiloto</strong> ·{" "}
            {activeStore.name} · Challenge FIAP 2026 (Tech_01)
          </span>
          <div className="flex items-center gap-4">
            <Link href="/catalogo" className="hover:text-signage">
              Catálogo
            </Link>
            <Link href="/mapa?id=pintura-quarto" className="hover:text-signage">
              Planta 2D
            </Link>
            <Link href="/painel" className="hover:text-signage">
              Vendedor
            </Link>
          </div>
        </div>
      </footer>

      <ProductDetailModal
        product={detailTarget?.product ?? null}
        storeName={activeStore.shortName}
        stockQty={detailTarget?.stockQty ?? 0}
        selected={false}
        onClose={() => setDetailTarget(null)}
        onToggleSelect={(prod) => {
          setDetailTarget(null);
          router.push(`/catalogo?q=${encodeURIComponent(prod.brand)}`);
        }}
        onOpenEsl={(prod, qty) =>
          setEslTarget({
            productId: prod.id,
            name: prod.name,
            sku: prod.sku,
            price: prod.price,
            aisle: prod.aisle,
            shelfLocation: prod.shelfLocation,
            stockQty: qty,
          })
        }
      />

      <EslShelfModal
        item={eslTarget}
        storeId={storeId}
        onClose={() => setEslTarget(null)}
      />
    </main>
  );
}
