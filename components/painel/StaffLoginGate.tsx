"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ArrowLeftIcon, ArrowRightIcon, ShieldCheckIcon, UserCheckIcon } from "@/components/Icons";

export type StaffSession = {
  badgeId: string;
  name: string;
  role: string;
  authenticatedAt: number;
};

const DEMO_STAFF: Omit<StaffSession, "authenticatedAt"> = {
  badgeId: "LM-4821",
  name: "Carlos Mendes",
  role: "Especialista de Loja",
};

export function StaffLoginGate({
  storeName,
  onAuthenticated,
}: {
  storeName: string;
  onAuthenticated: (session: StaffSession) => void;
}) {
  const [badgeId, setBadgeId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanBadge = badgeId.trim().toUpperCase();
    const cleanPin = pin.trim();

    if (cleanBadge.length < 3 || cleanPin.length < 4) {
      setError("Informe sua matrícula (ex: LM-4821) e o PIN de 4 dígitos, ou use o acesso de demonstração abaixo.");
      return;
    }

    setError(null);
    onAuthenticated({
      badgeId: cleanBadge,
      name: cleanBadge === DEMO_STAFF.badgeId ? DEMO_STAFF.name : `Colaborador ${cleanBadge}`,
      role: DEMO_STAFF.role,
      authenticatedAt: Date.now(),
    });
  }

  function handleDemoLogin() {
    setError(null);
    onAuthenticated({
      ...DEMO_STAFF,
      authenticatedAt: Date.now(),
    });
  }

  return (
    <main className="container-wide flex flex-1 items-center justify-center py-10">
      <div className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-rule bg-white shadow-floating">
        {/* Topo corporativo escuro */}
        <div className="bg-signage px-6 py-5 text-white">
          <div className="flex items-center justify-between gap-2">
            <Logo variant="dark" showSubtitle={false} className="origin-left scale-90" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wider text-leroy">
              <ShieldCheckIcon size={12} />
              Acesso restrito
            </span>
          </div>

          <h1 className="mt-4 font-display text-[22px] font-extrabold leading-tight text-white">
            Área do Colaborador
          </h1>
          <p className="mt-1 text-[13px] text-white/70">
            Console operacional exclusivo para a equipe da <strong className="text-white">{storeName}</strong>.
          </p>
        </div>

        {/* Formulário corporativo + 1 clique demonstração */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="staff-badge"
                className="block text-[12px] font-semibold text-signage"
              >
                Matrícula / Crachá corporativo
              </label>
              <input
                id="staff-badge"
                type="text"
                autoComplete="username"
                value={badgeId}
                onChange={(e) => {
                  setBadgeId(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ex: LM-4821"
                className="mt-1.5 h-11 w-full rounded-xl border border-rule-strong bg-floor px-3.5 text-[14px] text-signage outline-none transition focus:border-leroy-cta focus:bg-white"
              />
            </div>

            <div>
              <label
                htmlFor="staff-pin"
                className="block text-[12px] font-semibold text-signage"
              >
                PIN do colaborador
              </label>
              <input
                id="staff-pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••"
                className="mt-1.5 h-11 w-full rounded-xl border border-rule-strong bg-floor px-3.5 text-[14px] text-signage outline-none transition focus:border-leroy-cta focus:bg-white"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[12.5px] font-medium text-danger"
              >
                {error}
              </p>
            )}

            <button type="submit" className="btn-accent w-full">
              <span>Entrar no Console</span>
              <ArrowRightIcon size={15} />
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11.5px] text-signage-subtle">
            <span className="h-px flex-1 bg-rule" />
            <span>Demonstração / Banca FIAP</span>
            <span className="h-px flex-1 bg-rule" />
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            className="btn-secondary w-full"
          >
            <UserCheckIcon size={15} className="text-leroy-cta" />
            <span>Entrar em modo demonstração ({DEMO_STAFF.badgeId})</span>
          </button>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-4 text-[12px]">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-semibold text-signage-muted transition hover:text-signage"
            >
              <ArrowLeftIcon size={13} />
              Voltar para área do cliente
            </Link>
            <span className="text-[11px] text-signage-subtle">
              SSO ADEO em integração
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
