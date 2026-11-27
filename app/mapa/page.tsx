"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreBar } from "@/components/StoreBar";
import { StoreMap } from "@/components/StoreMap";
import { EslShelfModal } from "@/components/EslShelfModal";
import { ProductThumb } from "@/components/ProductThumb";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  CheckIcon,
  CompassIcon,
  MapPinIcon,
  RadioIcon,
} from "@/components/Icons";
import { getPresetProject } from "@/lib/projects";
import { computeStoreRoute, getAisleById } from "@/lib/storeMap";
import { getStoreById } from "@/lib/stores";
import {
  getDynamicProject,
  getSelectedStoreId,
  trackEvent,
} from "@/lib/telemetry";
import { DynamicProjectList, ProjectItem } from "@/lib/types";

export default function MapaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-floor" />}>
      <MapaInner />
    </Suspense>
  );
}

function MapaInner() {
  const params = useSearchParams();
  const projectId = params.get("id") ?? "";

  const [storeId, setStoreId] = useState("es-vitoria");
  const [project, setProject] = useState<DynamicProjectList | null>(null);
  const [navActive, setNavActive] = useState(false);
  const [stopIndex, setStopIndex] = useState(0);
  const [pickedItems, setPickedItems] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [navStartTs, setNavStartTs] = useState<number>(0);
  const [eslItem, setEslItem] = useState<ProjectItem | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const currentStore = getSelectedStoreId();
    setStoreId(currentStore);

    const loaded = getDynamicProject(projectId) ?? getPresetProject(projectId, currentStore);
    setMissing(!loaded);
    setProject(loaded);

    const onStore = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) setStoreId(next);
    };
    window.addEventListener("lm:store-changed", onStore);
    return () => window.removeEventListener("lm:store-changed", onStore);
  }, [projectId]);

  const targetAisles = useMemo(() => {
    if (!project) return [];
    return Array.from(
      new Set(
        project.items
          .filter((i) => i.inStock && !i.optional)
          .map((i) => i.aisle)
      )
    );
  }, [project]);

  const route = useMemo(() => computeStoreRoute(targetAisles), [targetAisles]);

  const completedAisles = useMemo(() => {
    const set = new Set<string>();
    if (!navActive && !completed) return set;
    for (let i = 1; i < route.orderedStops.length - 1; i++) {
      if (completed || i < stopIndex) {
        set.add(route.orderedStops[i]);
      }
    }
    return set;
  }, [navActive, completed, stopIndex, route.orderedStops]);

  function startNavigation() {
    setNavActive(true);
    setCompleted(false);
    setStopIndex(route.orderedStops.length > 2 ? 1 : 0);
    setNavStartTs(Date.now());
    trackEvent({
      type: "navigation_started",
      storeId,
      label: `Navegação guiada iniciada: ${project?.title ?? "Projeto"} (${route.totalMeters}m)`,
      aisle: route.orderedStops[1],
      painTopic: project?.sourceIntent,
    });
  }

  function advanceStop() {
    if (stopIndex < route.orderedStops.length - 1) {
      setStopIndex((prev) => prev + 1);
    } else {
      setCompleted(true);
      setNavActive(false);
      const elapsedSec = Math.max(
        30,
        Math.round((Date.now() - (navStartTs || Date.now())) / 1000)
      );
      trackEvent({
        type: "navigation_completed",
        storeId,
        label: `Navegação concluída (${targetAisles.length} corredores · ${route.totalMeters}m)`,
        aisle: route.orderedStops[1],
        painTopic: project?.sourceIntent,
        durationSec: elapsedSec,
      });
    }
  }

  function jumpToAisle(aisleId: string) {
    const idx = route.orderedStops.indexOf(aisleId);
    if (idx >= 0) {
      if (!navActive) {
        setNavActive(true);
        setCompleted(false);
        setNavStartTs(Date.now());
      }
      setStopIndex(idx);
    }
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col bg-floor">
        <StoreBar />
        {missing ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[14px] font-semibold text-signage">Não encontrei essa lista neste aparelho.</p>
            <p className="text-[12.5px] text-signage-muted">Ela pode ter sido criada em outro celular. Descreva o projeto de novo que o Copiloto monta em segundos.</p>
            <Link href="/chat" className="btn-accent">Abrir o Copiloto</Link>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center font-mono text-[13px] text-signage-muted">
            Calculando rota…
          </div>
        )}
      </div>
    );
  }

  const activeStore = getStoreById(storeId);
  const currentStopId = route.orderedStops[stopIndex];
  const currentAisle = getAisleById(currentStopId);
  const itemsAtCurrentAisle = project.items.filter(
    (i) => i.aisle === currentStopId && i.inStock
  );

  return (
    <div className="flex min-h-screen flex-col bg-floor">
      <StoreBar />

      {/* Cabeçalho Wayfinding */}
      <section className="border-b border-rule bg-white">
        <div className="container-wide flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <div className="flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-wider text-leroy-deep">
              <span>Sua rota na loja</span>
              <span>·</span>
              <span>{activeStore.shortName}</span>
            </div>
            <h1 className="mt-1 font-display text-[26px] font-extrabold text-signage sm:text-[32px]">
              {targetAisles.length} corredor{targetAisles.length !== 1 ? "es" : ""} ·{" "}
              <span className="font-mono text-leroy-dark">{route.totalMeters}m</span> · ~
              {route.estimatedMinutes} min
            </h1>
            <p className="mt-0.5 text-[13.5px] text-signage-muted">{project.title}</p>
          </div>

          {!navActive && !completed && (
            <button type="button" onClick={startNavigation} className="btn-accent">
              <CompassIcon size={16} />
              Iniciar navegação guiada
            </button>
          )}
        </div>
      </section>

      <main className="container-wide flex-1 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Mapa 2D (7 cols) */}
          <div className="space-y-5 lg:col-span-7">
            <StoreMap
              route={route}
              activeStopIndex={navActive ? stopIndex : null}
              completedAisles={completedAisles}
              onSelectAisle={jumpToAisle}
            />

            {/* Card de Navegação Ativa + ESL Pick-to-Light */}
            {navActive && currentAisle && (
              <div className="animate-slide-up overflow-hidden rounded-xl border-2 border-signage bg-white shadow-lg">
                <div className="flex items-center justify-between bg-signage px-4 py-2.5 text-white">
                  <span className="inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-leroy">
                    <CompassIcon size={14} />
                    Parada {stopIndex + 1} de {route.orderedStops.length}
                  </span>
                  <span className="font-mono text-[11px] text-white/65">
                    {currentAisle.department.toUpperCase()}
                  </span>
                </div>

                <div className="p-4">
                  <h2 className="font-display text-[21px] font-extrabold text-signage">
                    {currentAisle.label}
                  </h2>

                  {currentStopId === "ENTRY" && (
                    <p className="mt-1 text-[13px] text-signage-muted">
                      Partida no portão principal. Siga pela via frontal até o primeiro corredor destacado em verde.
                    </p>
                  )}

                  {currentStopId === "CHECKOUT" && (
                    <p className="mt-1 text-[13px] text-signage-muted">
                      Todos os corredores da sua lista foram percorridos. Finalize sua compra nos Caixas.
                    </p>
                  )}

                  {itemsAtCurrentAisle.length > 0 && (
                    <div className="mt-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="kicker">
                          Itens nesta gôndola · Último Metro
                        </span>
                        <span className="font-mono text-[11px] font-bold text-leroy-deep">
                          TOQUE EM LOCALIZAR
                        </span>
                      </div>

                      {itemsAtCurrentAisle.map((item) => {
                        const picked = Boolean(pickedItems[item.productId]);
                        return (
                          <div
                            key={item.productId}
                            className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition ${
                              picked
                                ? "border-leroy bg-leroy-soft/50"
                                : "border-rule bg-floor"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setPickedItems((prev) => ({
                                  ...prev,
                                  [item.productId]: !prev[item.productId],
                                }))
                              }
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              <span
                                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 ${
                                  picked
                                    ? "border-leroy bg-leroy text-signage"
                                    : "border-rule-strong bg-white"
                                }`}
                              >
                                {picked && <CheckIcon size={12} strokeWidth={2.8} />}
                              </span>
                              <ProductThumb
                                src={item.imageUrl}
                                alt={item.name}
                                category={item.category}
                                size={44}
                              />
                              <div className="min-w-0 flex-1">
                                <div
                                  className={`text-[13.5px] font-bold ${
                                    picked
                                      ? "text-signage-subtle line-through"
                                      : "text-signage"
                                  }`}
                                >
                                  {item.quantity}× {item.name}
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold text-leroy-deep">
                                  <MapPinIcon size={11} />
                                  {item.shelfLocation}
                                </div>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setEslItem(item)}
                              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md bg-signage px-3 py-2 font-mono text-[11px] font-bold uppercase text-leroy transition hover:bg-leroy hover:text-signage"
                            >
                              <RadioIcon size={13} />
                              Piscar etiqueta
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-rule pt-4">
                    <button
                      type="button"
                      disabled={stopIndex === 0}
                      onClick={() => setStopIndex((prev) => Math.max(0, prev - 1))}
                      className="btn-secondary !py-2 !text-[12.5px]"
                    >
                      <ArrowLeftIcon size={14} />
                      Anterior
                    </button>

                    <button
                      type="button"
                      onClick={advanceStop}
                      className="btn-accent !py-2 !text-[12.5px]"
                    >
                      {stopIndex < route.orderedStops.length - 1
                        ? `Avançar para ${
                            getAisleById(route.orderedStops[stopIndex + 1])?.shortLabel ??
                            "próxima"
                          }`
                        : "Concluir compra nos Caixas"}
                      <ArrowRightIcon size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Card de Conclusão */}
            {completed && (
              <div className="animate-slide-up rounded-xl border-2 border-leroy bg-leroy-soft p-5">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon
                    size={24}
                    className="mt-0.5 flex-shrink-0 text-leroy-deep"
                  />
                  <div className="flex-1">
                    <h2 className="font-display text-[21px] font-extrabold text-signage">
                      Jornada em loja concluída!
                    </h2>
                    <p className="mt-1 text-[13.5px] text-signage-muted">
                      Rota percorrida em {targetAisles.length} corredores ({route.totalMeters}m) sem voltas desnecessárias. Em casa, abra o tutorial pós-compra para executar com segurança.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/lista?id=${encodeURIComponent(project.id)}&tab=tutorial`}
                        className="btn-primary !py-2.5 !text-[12.5px]"
                      >
                        <BookOpenIcon size={14} />
                        Abrir tutorial pós-compra
                      </Link>
                      <Link
                        href="/painel"
                        className="btn-secondary !py-2.5 !text-[12.5px]"
                      >
                        Ver evento no Console Vendedor
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sequência de paradas (5 cols) */}
          <div className="space-y-4 lg:col-span-5">
            <div className="panel overflow-hidden">
              <div className="border-b border-rule bg-floor px-4 py-3">
                <span className="kicker">Roteiro de Coleta</span>
                <h2 className="font-display text-[16px] font-bold text-signage">
                  Paradas na ordem certa (toque para ver)
                </h2>
              </div>

              <ol className="divide-y divide-rule">
                {route.orderedStops.map((stopId, idx) => {
                  const aisle = getAisleById(stopId);
                  if (!aisle) return null;
                  const itemsHere = project.items.filter(
                    (i) => i.aisle === stopId && i.inStock
                  );
                  const isCurrent = navActive && idx === stopIndex;
                  const isDone = completed || (navActive && idx < stopIndex);
                  const isEndpoint = stopId === "ENTRY" || stopId === "CHECKOUT";

                  return (
                    <li
                      key={`${stopId}-${idx}`}
                      className={`px-4 py-3.5 transition ${
                        isCurrent ? "bg-leroy-soft/60" : "hover:bg-floor/60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => jumpToAisle(stopId)}
                          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md font-mono text-[11.5px] font-extrabold ${
                            isDone
                              ? "bg-leroy-dark text-white"
                              : isCurrent
                              ? "bg-leroy text-signage ring-2 ring-signage"
                              : isEndpoint
                              ? "bg-signage text-white"
                              : "bg-signage text-leroy"
                          }`}
                        >
                          {isDone ? (
                            <CheckIcon size={13} strokeWidth={2.8} />
                          ) : (
                            String(idx + 1).padStart(2, "0")
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => jumpToAisle(stopId)}
                            className="flex w-full items-center justify-between gap-2 text-left"
                          >
                            <span className="font-display text-[14px] font-bold text-signage">
                              {aisle.label}
                            </span>
                            {isCurrent && (
                              <span className="rounded bg-signage px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-leroy">
                                AGORA
                              </span>
                            )}
                          </button>

                          {itemsHere.length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {itemsHere.map((it) => (
                                <div
                                  key={it.productId}
                                  className="flex items-center justify-between gap-2 rounded border border-rule bg-white px-2 py-1.5 text-[12px]"
                                >
                                  <ProductThumb
                                    src={it.imageUrl}
                                    alt={it.name}
                                    category={it.category}
                                    size={34}
                                    className="p-0.5"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="line-clamp-2 font-semibold leading-snug text-signage">
                                      {it.quantity}× {it.name}
                                    </div>
                                    <div className="text-[12px] text-signage-muted">
                                      {it.shelfLocation}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setEslItem(it)}
                                    title="Acender a etiqueta do produto na prateleira"
                                    className="inline-flex h-10 flex-shrink-0 items-center gap-1.5 rounded-md border border-leroy/60 bg-leroy-soft px-3 text-[12.5px] font-bold text-leroy-deep hover:bg-leroy hover:text-signage"
                                  >
                                    <RadioIcon size={14} />
                                    Localizar
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-0.5 text-[11.5px] text-signage-subtle">
                              {stopId === "ENTRY"
                                ? "Ponto de partida no portão principal"
                                : "Finalização da compra nos Caixas"}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="space-y-2">
              <Link
                href={`/checkout?id=${encodeURIComponent(project.id)}`}
                className="btn-accent w-full"
              >
                Pagar no celular e sair (Sem fila)
                <ArrowRightIcon size={15} />
              </Link>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/lista?id=${encodeURIComponent(project.id)}`}
                  className="btn-secondary !py-2.5 !text-[12.5px]"
                >
                  <ArrowLeftIcon size={14} />
                  Voltar à lista
                </Link>
                <Link href="/chat" className="btn-primary !py-2.5 !text-[12.5px]">
                  Novo diagnóstico
                  <ArrowRightIcon size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <EslShelfModal
        item={eslItem}
        storeId={storeId}
        onClose={() => setEslItem(null)}
      />
    </div>
  );
}
