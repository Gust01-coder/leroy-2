"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import {
  ChartIcon,
  CloseIcon,
  CompassIcon,
  MessageIcon,
  QrCodeIcon,
  SearchIcon,
  StoreIcon,
} from "./Icons";
import { STORES, getStoreById } from "@/lib/store/stores";
import {
  getSelectedStoreId,
  setSelectedStoreId,
  trackEvent,
} from "@/lib/telemetry";
import { useDialog } from "./useDialog";

export function StoreBar() {
  const pathname = usePathname();
  const [storeId, setStoreId] = useState("es-vitoria");
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const qrDialogRef = useDialog<HTMLDivElement>(qrOpen, () => setQrOpen(false));
  const [currentOrigin, setCurrentOrigin] = useState("https://leroy-2.vercel.app");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStoreId(getSelectedStoreId());
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setStoreId(detail);
    };
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setStoreMenuOpen(false);
      }
    };
    window.addEventListener("lm:store-changed", handler);
    document.addEventListener("mousedown", onOutside);
    return () => {
      window.removeEventListener("lm:store-changed", handler);
      document.removeEventListener("mousedown", onOutside);
    };
  }, []);

  function handleStoreChange(nextId: string) {
    setStoreId(nextId);
    setSelectedStoreId(nextId);
    setStoreMenuOpen(false);
    const st = getStoreById(nextId);
    trackEvent({
      type: "store_changed",
      storeId: nextId,
      label: `Unidade alterada para ${st.shortName}`,
    });
  }

  const navItems = [
    { href: "/", label: "Início", Icon: CompassIcon, exact: true },
    { href: "/chat", label: "Copiloto IA", Icon: MessageIcon },
    { href: "/catalogo", label: "Catálogo", Icon: SearchIcon },
    { href: "/painel", label: "Vendedor", Icon: ChartIcon },
  ];

  const activeStore = getStoreById(storeId);

  return (
    <>
      {/* Header branco limpo com logo oficial Leroy Merlin */}
      <header className="sticky top-0 z-30 border-b border-rule/80 bg-white/95 text-signage backdrop-blur-md">
        <div className="container-wide flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex-shrink-0 focus:outline-none">
            <Logo variant="light" />
          </Link>

          <nav
            className="hidden h-full items-center gap-1 md:flex"
            aria-label="Navegação principal"
          >
            {navItems.map(({ href, label, Icon, exact }) => {
              const active = exact
                ? pathname === href
                : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-[13.5px] font-semibold transition ${
                    active
                      ? "bg-leroy-soft text-leroy-deep"
                      : "text-signage-muted hover:bg-floor hover:text-signage"
                  }`}
                >
                  <Icon size={15} className={active ? "text-leroy-cta" : ""} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex min-w-0 items-center gap-2">
            {/* Seletor de unidade */}
            <div ref={menuRef} className="relative min-w-0">
              <button
                type="button"
                onClick={() => setStoreMenuOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={storeMenuOpen}
                aria-label={`Loja: ${activeStore.shortName}. Trocar de loja`}
                className="inline-flex h-10 max-w-full items-center gap-2 rounded-xl border border-rule bg-floor px-3 text-[12.5px] font-semibold text-signage transition hover:border-leroy/70 hover:bg-white"
              >
                <StoreIcon size={14} className="flex-shrink-0 text-leroy-cta" />
                <span className="min-w-0 max-w-[125px] truncate sm:max-w-[170px]">
                  {activeStore.shortName}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className={`flex-shrink-0 text-signage-subtle transition ${
                    storeMenuOpen ? "rotate-180" : ""
                  }`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {storeMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 animate-fade-in overflow-hidden rounded-2xl border border-rule bg-white text-signage shadow-floating">
                  <div className="border-b border-rule bg-floor px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-signage-subtle">
                    Selecionar Unidade Física
                  </div>
                  {STORES.map((s) => {
                    const selected = s.id === storeId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleStoreChange(s.id)}
                        className={`flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left text-[13px] transition hover:bg-floor ${
                          selected ? "bg-leroy-soft/70 font-semibold text-signage" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-bold">{s.name}</div>
                          <div className="truncate text-[11.5px] font-normal text-signage-muted">
                            {s.address}
                          </div>
                          <div className="mt-0.5 font-mono text-[10.5px] text-leroy-deep">
                            {s.areaM2.toLocaleString("pt-BR")}m² · {s.parkingSpots} vagas
                          </div>
                        </div>
                        {selected && (
                          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-leroy-cta" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setQrOpen(true)}
              aria-label="Abrir etiqueta QR do carrinho"
              title="Etiqueta QR Code do Carrinho"
              className="inline-flex h-10 min-w-[40px] items-center justify-center gap-1.5 rounded-xl border border-rule bg-white px-3 text-[12.5px] font-semibold text-signage transition hover:border-leroy hover:text-leroy-deep"
            >
              <QrCodeIcon size={15} />
              <span className="hidden sm:inline">QR</span>
            </button>
          </div>
        </div>

        {/* Navegação mobile compacta */}
        <div className="grid grid-cols-4 border-t border-rule bg-white md:hidden">
          {navItems.map(({ href, label, Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-semibold transition ${
                  active
                    ? "border-b-2 border-leroy-cta text-leroy-deep"
                    : "text-signage-muted"
                }`}
              >
                <Icon size={15} />
                <span className="truncate">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Modal Etiqueta Física do Carrinho Leroy Merlin */}
      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-signage/60 p-4 backdrop-blur-sm"
          onClick={() => setQrOpen(false)}
        >
          <div
            ref={qrDialogRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-label="Etiqueta QR do carrinho"
            className="w-full max-w-[400px] animate-slide-up overflow-hidden rounded-2xl border border-rule bg-white shadow-2xl focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-signage px-5 py-3.5 text-white">
              <Logo variant="dark" showSubtitle={false} className="scale-90 origin-left" />
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="p-5">
              <div className="rounded-xl border border-rule bg-floor p-4 text-center">
                <div className="font-display text-[17px] font-extrabold text-signage">
                  Precisa achar uma peça?
                </div>
                <p className="mt-0.5 text-[12.5px] text-signage-muted">
                  Aponte a câmera · Sem app · Sem cadastro
                </p>

                <div className="mx-auto mt-3.5 inline-flex rounded-xl border border-rule bg-white p-3 shadow-card">
                  <StylizedQrSvg />
                </div>

                <div className="mt-3 break-all font-mono text-[10.5px] font-medium text-signage-muted">
                  {currentOrigin}/chat?store={activeStore.id}
                </div>

                <div className="mt-2.5 flex items-center justify-center gap-2 border-t border-rule pt-2.5 text-[11px] font-semibold text-leroy-deep">
                  <span>{activeStore.shortName}</span>
                  <span>·</span>
                  <span>{activeStore.areaM2.toLocaleString("pt-BR")}m²</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Link
                  href="/chat"
                  onClick={() => setQrOpen(false)}
                  className="btn-accent !text-[13px]"
                >
                  Entrar pelo QR
                </Link>
                <Link
                  href="/painel"
                  onClick={() => setQrOpen(false)}
                  className="btn-secondary !text-[13px]"
                >
                  Painel Vendedor
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StylizedQrSvg() {
  const cells = [
    "11111110101101111111",
    "10000010010011000001",
    "10111010111001011101",
    "10111010001101011101",
    "10111010100101011101",
    "10000010110011000001",
    "11111110101011111111",
    "00000000110100000000",
    "10110111001011011010",
    "01001010110100100101",
    "11011001101110110011",
    "00100110010001001100",
    "10111011011010110101",
    "00000000101010011010",
    "11111110110101101001",
    "10000010001100110110",
    "10111010110011001011",
    "10111010101101110100",
    "10111010010110011011",
    "11111110101001100101",
  ];

  return (
    <svg viewBox="0 0 200 200" className="h-32 w-32" aria-label="QR Code LM Copiloto">
      <rect width="200" height="200" fill="#FFFFFF" />
      {cells.map((row, y) =>
        row.split("").map((bit, x) =>
          bit === "1" ? (
            <rect
              key={`${x}-${y}`}
              x={10 + x * 9}
              y={10 + y * 9}
              width="7.8"
              height="7.8"
              fill="#14171A"
            />
          ) : null
        )
      )}
      <polygon points="100,72 128,118 72,118" fill="#78BE20" stroke="#FFFFFF" strokeWidth="4" />
      <text
        x="100"
        y="111"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="12"
        fontWeight="800"
        fontFamily="var(--font-display), sans-serif"
      >
        LM
      </text>
    </svg>
  );
}
