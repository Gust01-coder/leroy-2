"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StoreBar } from "@/components/StoreBar";
import { Logo } from "@/components/Logo";
import { VoiceButton } from "@/components/VoiceButton";
import { ProductCardMedia } from "@/components/ProductThumb";
import { ProductDetailModal } from "@/components/ProductDetailModal";
import { EslShelfModal } from "@/components/EslShelfModal";
import {
  ArrowRightIcon,
  CameraIcon,
  DropletIcon,
  LayersIcon,
  MapPinIcon,
  PaintbrushIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparkleIcon,
  WrenchIcon,
  ZapIcon,
} from "@/components/Icons";
import { CATALOG, getProductById, getStockForStore } from "@/lib/catalog";
import { getStoreById } from "@/lib/stores";
import { getSelectedStoreId, getStoredTickets } from "@/lib/telemetry";
import { Product, ProjectItem } from "@/lib/types";

const DEPARTMENTS = [
  { label: "Hidráulica", cat: "Hidráulica", Icon: DropletIcon },
  { label: "Tintas", cat: "Tintas", Icon: PaintbrushIcon },
  { label: "Ferramentas", cat: "Ferramentas", Icon: WrenchIcon },
  { label: "Fixação", cat: "Fixação", Icon: LayersIcon },
  { label: "Elétrica", cat: "Elétrica", Icon: ZapIcon },
  { label: "Obra", cat: "Materiais Básicos", Icon: ShieldCheckIcon },
  { label: "Limpeza", cat: "Limpeza", Icon: SparkleIcon },
];

const QUICK_SCENARIOS = [
  {
    corridor: "C05",
    sector: "Hidráulica",
    title: "Vazamento ou torneira",
    hint: "Diagnóstico em 15s",
    prompt: "Minha torneira está pingando",
    productId: "hid-torneira-mono",
  },
  {
    corridor: "C09",
    sector: "Tintas",
    title: "Pintar um cômodo",
    hint: "Calcula litros por m²",
    prompt: "Quero pintar um quarto azul de 3x4m",
    productId: "tin-acrilica-18l-azul",
  },
  {
    corridor: "C16",
    sector: "Fixação",
    title: "Instalar prateleira",
    hint: "Alvenaria ou drywall",
    prompt: "Quero instalar uma prateleira na parede",
    productId: "fix-prateleira-mdf",
  },
  {
    corridor: "C19",
    sector: "Elétrica",
    title: "Chuveiro ou LED",
    hint: "Troca segura 220V",
    prompt: "Meu chuveiro parou de esquentar",
    productId: "ele-chuveiro-eletronico",
  },
];

const COMMON_REQUESTS = [
  "Pia entupida",
  "Descarga não para de encher",
  "Rejunte do box mofado",
  "Portão de ferro enferrujado",
  "Porta rangendo",
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
  const [openTickets, setOpenTickets] = useState(0);
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

      {/* ===== 1. HERO EDITORIAL FOTOGRÁFICO ESCURO ===== */}
      <section className="relative overflow-hidden bg-signage text-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/hero-editorial.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[76%_20%] opacity-85"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#14171A] via-[#14171A]/92 via-[50%] to-[#14171A]/20"
        />

        <div className="container-wide relative z-10 pb-16 pt-10 md:pb-20 md:pt-14">
          <div className="max-w-[560px]">
            <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[12px] font-medium text-white/90 backdrop-blur-sm">
              <MapPinIcon size={13} className="flex-shrink-0 text-leroy" />
              <span className="truncate">
                Você está na <strong className="font-semibold text-white">{activeStore.name}</strong>
              </span>
            </div>

            <h1 className="mt-4 font-display text-[32px] font-extrabold leading-[1.08] tracking-tight text-white sm:text-[44px]">
              Resolva sua obra na loja<span className="text-leroy">.</span>
            </h1>

            <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-white/75">
              Descreva o problema do seu jeito, fale no microfone ou fotografe a peça — achamos o produto real, o corredor e o checkout sem fila.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/chat" className="btn-accent !px-6">
                <span>Abrir Copiloto IA</span>
                <ArrowRightIcon size={16} />
              </Link>

              <Link
                href="/chat?vision=1"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-[13.5px] font-semibold text-white backdrop-blur-sm transition hover:border-leroy hover:bg-white/15"
              >
                <CameraIcon size={16} />
                <span>Enviar foto da peça</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. BARRA DE BUSCA FLUTUANTE SOBRE A BORDA DO HERO ===== */}
      <div className="container-wide relative z-20 -mt-7">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            launchQuery(command, false);
          }}
          className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-floating ring-1 ring-black/5 sm:flex-row sm:items-center"
        >
          <div className="relative flex flex-1 items-center">
            <SearchIcon
              size={18}
              className="pointer-events-none absolute left-3.5 text-signage-subtle"
            />
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Busque produto ou descreva o problema (ex: torneira pingando)…"
              className="h-12 w-full rounded-xl bg-transparent pl-11 pr-3 text-[14.5px] text-signage outline-none placeholder:text-signage-subtle"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <VoiceButton
              compact
              onTranscript={(transcript) => launchQuery(transcript, true)}
            />

            <Link
              href="/chat?vision=1"
              aria-label="Diagnosticar por foto"
              title="Diagnosticar peça por foto"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-rule-strong bg-white text-signage transition hover:border-leroy hover:bg-leroy-soft hover:text-leroy-deep"
            >
              <CameraIcon size={17} />
            </Link>

            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-leroy-cta px-6 text-[14px] font-semibold text-white shadow-sm transition hover:bg-leroy-deep sm:flex-initial"
            >
              <SearchIcon size={15} />
              <span>Buscar</span>
            </button>
          </div>
        </form>

        {/* Pedidos comuns de 1 toque (inclui os novos projetos: rejunte, portão, descarga, pia entupida) */}
        <div
          role="group"
          aria-labelledby="pedidos-comuns"
          className="mt-3 flex flex-wrap items-center gap-1.5"
        >
          <span id="pedidos-comuns" className="mr-1 text-[12px] font-medium text-signage-subtle">
            Pedidos comuns:
          </span>
          {COMMON_REQUESTS.map((req) => (
            <button
              key={req}
              type="button"
              onClick={() => launchQuery(req)}
              className="inline-flex min-h-[36px] items-center rounded-full border border-rule bg-white px-3 text-[12px] font-medium text-signage-muted transition hover:border-leroy hover:text-leroy-deep"
            >
              {req}
            </button>
          ))}
        </div>
      </div>

      {/* ===== CONTEÚDO PRINCIPAL EM SEÇÕES BRANCAS ELEVADAS ===== */}
      <div className="container-wide space-y-8 py-7">
        {/* 3. Dock de 7 Departamentos com Ícones */}
        <section aria-label="Departamentos">
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-7 sm:gap-3">
            {DEPARTMENTS.map(({ label, cat, Icon }) => (
              <Link
                key={label}
                href={`/catalogo?cat=${encodeURIComponent(cat)}`}
                className="group flex flex-col items-center justify-center rounded-2xl border border-rule/70 bg-white px-2 py-3.5 text-center shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-leroy/70 hover:shadow-card-hover"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-leroy-soft text-leroy-deep transition group-hover:bg-leroy-cta group-hover:text-white">
                  <Icon size={20} />
                </div>
                <span className="mt-2 max-w-full truncate text-[11px] font-semibold text-signage sm:text-[12px]">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 4. Seção Branca Elevada: Projetos Mais Resolvidos */}
        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[20px] font-extrabold text-signage">
                Comece pelo problema
              </h2>
              <p className="mt-0.5 text-[13px] text-signage-muted">
                Escolha um cenário pronto para gerar lista por corredor, orçamento e checkout expresso
              </p>
            </div>
            <Link
              href="/chat"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-leroy-cta px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-leroy-deep"
            >
              Abrir assistente
              <ArrowRightIcon size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {QUICK_SCENARIOS.map(({ corridor, sector, title, hint, prompt, productId }) => {
              const prod = getProductById(productId);
              return (
                <Link
                  key={corridor}
                  href={`/chat?q=${encodeURIComponent(prompt)}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-rule/80 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-leroy/70 hover:shadow-card-hover"
                >
                  <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden border-b border-rule/60 bg-white p-2.5">
                    {prod?.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prod.imageUrl}
                        alt={title}
                        loading="lazy"
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.05]"
                      />
                    )}
                    <span className="aisle-plate absolute left-2.5 top-2.5 shadow-sm">
                      {corridor}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-leroy-deep">
                      {sector}
                    </div>
                    <div className="mt-0.5 font-display text-[14.5px] font-bold leading-snug text-signage group-hover:text-leroy-deep">
                      {title}
                    </div>
                    <div className="mt-1 text-[12px] text-signage-muted">{hint}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 5. Banner Visual de Destaque: Planta 2D, Etiqueta ESL & Checkout Sem Fila */}
        <section className="relative overflow-hidden rounded-2xl bg-signage text-white shadow-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/banner-decor.jpg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-55"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#14171A]/95 via-[#14171A]/80 to-[#14171A]/30"
          />

          <div className="relative z-10 flex flex-col items-start justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-center">
            <div className="max-w-[560px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-leroy/20 px-3 py-1 text-[11.5px] font-semibold text-leroy">
                Planta 2D · {activeStore.shortName}
              </span>
              <h2 className="mt-3 font-display text-[22px] font-extrabold leading-tight text-white sm:text-[26px]">
                Ache a prateleira exata e saia sem fila.
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/75">
                Veja a rota pelos corredores no mapa 2D, acenda a etiqueta no produto e finalize no Checkout Expresso com Pix 5% OFF.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href="/mapa?id=pintura-quarto" className="btn-accent !px-5">
                <span>Abrir Planta 2D</span>
                <ArrowRightIcon size={15} />
              </Link>
              <Link
                href="/checkout?id=instalar-prateleira"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                Checkout Sem Fila
              </Link>
            </div>
          </div>
        </section>

        {/* 6. Seção Branca Elevada: Destaques em Estoque (63 produtos oficiais Leroy) */}
        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-[20px] font-extrabold text-signage">
                Destaques em {activeStore.shortName}
              </h2>
              <p className="mt-0.5 text-[13px] text-signage-muted">
                Produtos oficiais da Leroy Merlin com foto real, código e link do site
              </p>
            </div>
            <Link
              href="/catalogo"
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-leroy-cta px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-leroy-deep"
            >
              Ver todos ({CATALOG.length})
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
                  className="group flex flex-col overflow-hidden rounded-xl border border-rule/80 bg-white text-left transition duration-200 hover:-translate-y-0.5 hover:border-leroy/70 hover:shadow-card-hover"
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
                        <span className="font-mono font-bold uppercase tracking-wider text-signage-subtle">
                          {prod.brand}
                        </span>
                        {prod.leroyExclusive && (
                          <span className="font-mono text-[10px] font-semibold text-leroy-deep">
                            · Exclusivo
                          </span>
                        )}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[13.5px] font-semibold leading-snug text-signage group-hover:text-leroy-deep">
                        {prod.name}
                      </div>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between border-t border-rule/70 pt-2.5">
                      <span className="font-mono text-[15.5px] font-extrabold tabular-nums text-signage">
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
      </div>

      {/* ===== 7. RODAPÉ ESCURO INSTITUCIONAL ===== */}
      <footer className="mt-auto bg-signage text-white">
        <div className="container-wide grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Logo variant="dark" />
            <p className="text-[12.5px] leading-relaxed text-white/60">
              Assistente de autoatendimento em loja física para a unidade{" "}
              <span className="text-white/85">{activeStore.name}</span>. Challenge FIAP 2026 — Grupo Tech_01.
            </p>
          </div>

          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-white/50">
              Atendimento
            </h3>
            <ul className="mt-3 space-y-2 text-[13px] text-white/75">
              <li>
                <Link href="/chat" className="transition hover:text-leroy">
                  Copiloto IA (Chat & Voz)
                </Link>
              </li>
              <li>
                <Link href="/chat?vision=1" className="transition hover:text-leroy">
                  Diagnosticar por Foto
                </Link>
              </li>
              <li>
                <Link href="/catalogo" className="transition hover:text-leroy">
                  Catálogo ({CATALOG.length} SKUs)
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-white/50">
              Na Loja
            </h3>
            <ul className="mt-3 space-y-2 text-[13px] text-white/75">
              <li>
                <Link href="/mapa?id=pintura-quarto" className="transition hover:text-leroy">
                  Planta 2D & Etiqueta ESL
                </Link>
              </li>
              <li>
                <Link href="/lista?id=instalar-prateleira" className="transition hover:text-leroy">
                  Lista por Corredor (Demo)
                </Link>
              </li>
              <li>
                <Link href="/checkout?id=instalar-prateleira" className="transition hover:text-leroy">
                  Checkout Expresso Sem Fila
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-white/50">
              Operação
            </h3>
            <ul className="mt-3 space-y-2 text-[13px] text-white/75">
              <li>
                <Link
                  href="/painel"
                  className="inline-flex items-center gap-2 transition hover:text-leroy"
                >
                  <span>Console do Vendedor</span>
                  {openTickets > 0 && (
                    <span className="rounded-full bg-leroy px-2 py-0.5 font-mono text-[10.5px] font-extrabold text-signage">
                      {openTickets}
                    </span>
                  )}
                </Link>
              </li>
              <li className="text-[12px] text-white/45">
                {activeStore.address}
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-wide flex flex-wrap items-center justify-between gap-2 py-4 text-[11.5px] text-white/45">
            <span>LM Copiloto v2 · Challenge FIAP 2026 · Grupo Tech_01</span>
            <span>Protótipo: preços de referência, estoque e planta ilustrativos</span>
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
