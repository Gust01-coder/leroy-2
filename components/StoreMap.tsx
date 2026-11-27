"use client";

import { useState } from "react";
import {
  AISLES,
  ARCHITECTURAL_ZONES,
  ComputedStoreRoute,
  MAP_VIEW_H,
  MAP_VIEW_W,
  getAisleById,
} from "@/lib/store/storeMap";
import { RoutePoint } from "@/lib/types";

function pointsToPath(pts: RoutePoint[]): string {
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function heatColors(ratio: number): {
  fill: string;
  stroke: string;
  text: string;
  sub: string;
} {
  if (ratio >= 0.78) {
    return { fill: "#B91C1C", stroke: "#7F1D1D", text: "#FFFFFF", sub: "#FEE2E2" };
  }
  if (ratio >= 0.52) {
    return { fill: "#D97706", stroke: "#92400E", text: "#FFFFFF", sub: "#FEF3C7" };
  }
  if (ratio >= 0.28) {
    return { fill: "#78BE20", stroke: "#4F8A10", text: "#111315", sub: "#264107" };
  }
  return { fill: "#E5E7EB", stroke: "#B8BFC9", text: "#374151", sub: "#6B7280" };
}

function zoneStyle(tone: string): {
  fill: string;
  stroke: string;
  title: string;
  sub: string;
} {
  switch (tone) {
    case "garden":
      return {
        fill: "#E9F5DC",
        stroke: "#97C95C",
        title: "#2F5209",
        sub: "#4F8A10",
      };
    case "service":
      return {
        fill: "#EFF4F8",
        stroke: "#94A3B8",
        title: "#1E293B",
        sub: "#64748B",
      };
    case "drivethru":
      return {
        fill: "#FEF3C7",
        stroke: "#D97706",
        title: "#92400E",
        sub: "#B45309",
      };
    case "showroom":
      return {
        fill: "#F3F4F6",
        stroke: "#CBD5E1",
        title: "#334155",
        sub: "#64748B",
      };
    default:
      return {
        fill: "#F8FAFC",
        stroke: "#CBD5E1",
        title: "#475569",
        sub: "#64748B",
      };
  }
}

export function StoreMap({
  route,
  activeStopIndex,
  completedAisles,
  onSelectAisle,
  heatmapCounts,
}: {
  route?: ComputedStoreRoute;
  activeStopIndex?: number | null;
  completedAisles?: Set<string>;
  onSelectAisle?: (aisleId: string) => void;
  heatmapCounts?: Record<string, number>;
}) {
  const [zoom, setZoom] = useState<1 | 1.35>(1);

  const isHeatmap = Boolean(heatmapCounts);
  const maxHeat = isHeatmap
    ? Math.max(1, ...Object.values(heatmapCounts ?? {}))
    : 1;

  const highlighted = new Set(
    route?.orderedStops.filter((id) => id !== "ENTRY" && id !== "CHECKOUT") ?? []
  );
  const currentStopId =
    route && typeof activeStopIndex === "number" && activeStopIndex >= 0
      ? route.orderedStops[activeStopIndex]
      : null;
  const currentAisle = currentStopId ? getAisleById(currentStopId) : null;

  return (
    <div className="overflow-hidden rounded-xl border border-rule bg-white">
      {/* Barra arquitetônica superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-signage px-4 py-2 text-white">
        <div className="flex min-w-0 flex-1 items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.12em]">
          <span className="h-2 w-2 flex-shrink-0 bg-leroy" />
          <span className="truncate">
            {isHeatmap
              ? "Planta 2D · Mapa de Calor de Demanda"
              : "Planta ilustrativa da loja"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[9.5px] text-white/55 sm:inline">
            PLANTA ILUSTRATIVA
          </span>
          <div className="inline-flex overflow-hidden rounded border border-white/15 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setZoom(1)}
              className={`px-2 py-0.5 font-bold ${
                zoom === 1 ? "bg-leroy text-signage" : "text-white/70 hover:text-white"
              }`}
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => setZoom(1.35)}
              className={`px-2 py-0.5 font-bold ${
                zoom === 1.35
                  ? "bg-leroy text-signage"
                  : "text-white/70 hover:text-white"
              }`}
            >
              135%
            </button>
          </div>
        </div>
      </div>

      {/* Área da planta com suporte a zoom/scroll horizontal */}
      <div className="overflow-x-auto bg-[#F8F9FB] p-2.5 sm:p-3.5">
        <div
          style={{ width: zoom === 1 ? "100%" : "135%", transition: "width 0.2s ease" }}
        >
          <svg
            viewBox={`0 0 ${MAP_VIEW_W} ${MAP_VIEW_H}`}
            className="h-auto w-full select-none"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label="Planta 2D fiel à unidade Leroy Merlin Vitória (Av. Fernando Ferrari / Jardim Camburi)"
          >
            {/* Contorno externo da edificação (Salão Principal 15.700m²) */}
            <rect
              x="2"
              y="2"
              width="164"
              height="85.5"
              rx="1.5"
              fill="#FFFFFF"
              stroke="#111315"
              strokeWidth="0.65"
            />

            {/* Grade CAD discreta dentro da edificação */}
            {Array.from({ length: 16 }).map((_, i) => (
              <line
                key={`vg-${i}`}
                x1={10 + i * 10}
                y1={2}
                x2={10 + i * 10}
                y2={87.5}
                stroke="#F1F3F6"
                strokeWidth={0.18}
              />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={`hg-${i}`}
                x1={2}
                y1={10 + i * 10}
                x2={166}
                y2={10 + i * 10}
                stroke="#F1F3F6"
                strokeWidth={0.18}
              />
            ))}

            {/* Faixa superior de placas aéreas de departamento */}
            {[
              { x: 14.2, w: 20.5, label: "JARDIM & PISOS" },
              { x: 42, w: 24, label: "BANHO & HIDRÁULICA" },
              { x: 72, w: 24, label: "TINTAS & CORES" },
              { x: 102, w: 24, label: "FERRAMENTAS" },
              { x: 129.8, w: 19.5, label: "ELÉTRICA / LED" },
              { x: 154.7, w: 18.5, label: "CONSTRUÇÃO" },
            ].map((hdr) => (
              <g key={hdr.label}>
                <rect
                  x={hdr.x - hdr.w / 2}
                  y="4.2"
                  width={hdr.w}
                  height="4.4"
                  rx="0.6"
                  fill="#111315"
                />
                <text
                  x={hdr.x}
                  y="7.1"
                  fontSize="1.75"
                  fontWeight="800"
                  fill="#FFFFFF"
                  textAnchor="middle"
                  letterSpacing="0.12"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  {hdr.label}
                </text>
              </g>
            ))}

            {/* Alamedas principais de circulação (Alameda Frontal + Avenida Central) */}
            <rect x="26" y="71.2" width="119" height="4.6" rx="0.8" fill="#EEF0F4" />
            <text
              x="141"
              y="74.2"
              fontSize="1.5"
              fontWeight="700"
              fill="#94A3B8"
              textAnchor="end"
              letterSpacing="0.38"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              ALAMEDA FRONTAL
            </text>

            <rect x="26" y="40.8" width="119" height="3.4" rx="0.6" fill="#F1F3F7" />
            <text
              x="85"
              y="43.1"
              fontSize="1.45"
              fontWeight="600"
              fill="#94A3B8"
              textAnchor="middle"
              letterSpacing="0.45"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              CORREDOR TRANSVERSAL CENTRAL
            </text>

            {/* Zonas Arquitetônicas Reais da Leroy Merlin Vitória */}
            {ARCHITECTURAL_ZONES.map((z) => {
              const st = zoneStyle(z.tone);
              return (
                <g key={z.id}>
                  <rect
                    x={z.x}
                    y={z.y}
                    width={z.width}
                    height={z.height}
                    rx="1"
                    fill={st.fill}
                    stroke={st.stroke}
                    strokeWidth="0.35"
                    strokeDasharray={z.tone === "drivethru" ? "1.6 1" : undefined}
                  />
                  <text
                    x={z.x + z.width / 2}
                    y={z.y + (z.sublabel ? z.height / 2 - 0.5 : z.height / 2 + 0.7)}
                    fontSize={z.width < 20 ? 1.55 : 1.7}
                    fontWeight="800"
                    textAnchor="middle"
                    fill={st.title}
                    style={{ fontFamily: "var(--font-display), sans-serif" }}
                  >
                    {z.label}
                  </text>
                  {z.sublabel && (
                    <text
                      x={z.x + z.width / 2}
                      y={z.y + z.height / 2 + 2.2}
                      fontSize="1.35"
                      fontWeight="500"
                      textAnchor="middle"
                      fill={st.sub}
                      style={{ fontFamily: "var(--font-sans), sans-serif" }}
                    >
                      {z.sublabel}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Corredores Mapeados (H1–H3, T1–T3, F1–F3, E1–E2, L2, M4 + Entrada/Caixas/Instala) */}
            {AISLES.map((a) => {
              const isSpecial =
                a.id === "ENTRY" || a.id === "CHECKOUT" || a.id === "DESK";

              let fill = "#FFFFFF";
              let stroke = "#B8BFC9";
              let textColor = "#111315";
              let subColor = "#64748B";

              if (isHeatmap) {
                if (isSpecial) {
                  fill = "#111315";
                  stroke = "#111315";
                  textColor = "#FFFFFF";
                  subColor = "#9CA3AF";
                } else {
                  const count = heatmapCounts?.[a.id] ?? 0;
                  const hc = heatColors(count / maxHeat);
                  fill = hc.fill;
                  stroke = hc.stroke;
                  textColor = hc.text;
                  subColor = hc.sub;
                }
              } else {
                const isTarget = highlighted.has(a.id);
                const isCurrent = currentStopId === a.id;
                const isDone = completedAisles?.has(a.id);

                if (a.id === "ENTRY" || a.id === "CHECKOUT") {
                  fill = isCurrent ? "#78BE20" : "#111315";
                  stroke = isCurrent ? "#4F8A10" : "#111315";
                  textColor = isCurrent ? "#111315" : "#FFFFFF";
                  subColor = "#D1D5DB";
                } else if (a.id === "DESK") {
                  fill = "#1E293B";
                  stroke = "#1E293B";
                  textColor = "#78BE20";
                } else if (isCurrent) {
                  fill = "#4F8A10";
                  stroke = "#111315";
                  textColor = "#FFFFFF";
                  subColor = "#ECF7DF";
                } else if (isDone) {
                  fill = "#ECF7DF";
                  stroke = "#78BE20";
                  textColor = "#3B6609";
                  subColor = "#4F8A10";
                } else if (isTarget) {
                  fill = "#78BE20";
                  stroke = "#3B6609";
                  textColor = "#111315";
                  subColor = "#243F06";
                }
              }

              const stopOrder = route ? route.orderedStops.indexOf(a.id) : -1;
              const clickable = Boolean(
                !isHeatmap &&
                  onSelectAisle &&
                  (highlighted.has(a.id) || a.id === "ENTRY" || a.id === "CHECKOUT")
              );
              const heatCount = heatmapCounts?.[a.id] ?? 0;

              return (
                <g
                  key={a.id}
                  onClick={() => clickable && onSelectAisle?.(a.id)}
                  style={{ cursor: clickable ? "pointer" : "default" }}
                >
                  <rect
                    x={a.x}
                    y={a.y}
                    width={a.width}
                    height={a.height}
                    rx={0.9}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={currentStopId === a.id ? 0.65 : 0.4}
                  />

                  <text
                    x={a.x + a.width / 2}
                    y={a.y + (isSpecial ? a.height / 2 + 0.8 : 4.2)}
                    fontSize={isSpecial ? 2.0 : 2.25}
                    fontWeight={800}
                    textAnchor="middle"
                    fill={textColor}
                    style={{ fontFamily: "var(--font-mono), monospace" }}
                  >
                    {isSpecial
                      ? a.shortLabel.toUpperCase()
                      : a.corridorNumber ?? a.id}
                  </text>

                  {!isSpecial && (
                    <text
                      x={a.x + a.width / 2}
                      y={a.y + 7.6}
                      fontSize={1.65}
                      fontWeight={600}
                      textAnchor="middle"
                      fill={subColor}
                      style={{ fontFamily: "var(--font-sans), sans-serif" }}
                    >
                      {isHeatmap ? `${heatCount} interações` : a.shortLabel}
                    </text>
                  )}

                  {!isHeatmap && highlighted.has(a.id) && stopOrder > 0 && (
                    <g transform={`translate(${a.x + a.width - 1.3}, ${a.y + 1.3})`}>
                      <rect
                        x={-2.3}
                        y={-2.3}
                        width={4.6}
                        height={4.6}
                        rx={0.8}
                        fill={completedAisles?.has(a.id) ? "#3B6609" : "#111315"}
                        stroke="#FFFFFF"
                        strokeWidth={0.45}
                      />
                      <text
                        y={0.8}
                        fontSize={2.05}
                        fontWeight={800}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        style={{ fontFamily: "var(--font-mono), monospace" }}
                      >
                        {completedAisles?.has(a.id) ? "✓" : stopOrder}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Estacionamento Coberto (338 vagas) */}
            <rect
              x="2"
              y="89.5"
              width="164"
              height="8.5"
              rx="1"
              fill="#EDF0F4"
              stroke="#CBD5E1"
              strokeWidth="0.35"
            />
            <text
              x="84"
              y="94.7"
              fontSize="1.9"
              fontWeight="700"
              fill="#475569"
              textAnchor="middle"
              letterSpacing="0.25"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              ESTACIONAMENTO COBERTO · 338 VAGAS · RECARGA VEÍCULO ELÉTRICO
            </text>

            {/* Via Externa Real: Av. Fernando Ferrari (Aeroporto ↔ Jardim Camburi) */}
            <rect x="2" y="100" width="164" height="10" rx="1" fill="#1E2226" />
            <line
              x1="6"
              y1="105"
              x2="162"
              y2="105"
              stroke="#78BE20"
              strokeWidth="0.4"
              strokeDasharray="3 2.5"
              opacity="0.55"
            />
            <text
              x="10"
              y="106.1"
              fontSize="1.75"
              fontWeight="700"
              fill="#9CA3AF"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              ← AEROPORTO / GOIABEIRAS
            </text>
            <text
              x="84"
              y="106.1"
              fontSize="2.05"
              fontWeight="800"
              fill="#FFFFFF"
              textAnchor="middle"
              letterSpacing="0.18"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              AV. FERNANDO FERRARI, 2600
            </text>
            <text
              x="158"
              y="106.1"
              fontSize="1.75"
              fontWeight="800"
              fill="#78BE20"
              textAnchor="end"
              style={{ fontFamily: "var(--font-mono), monospace" }}
            >
              JARDIM CAMBURI / SERRA →
            </text>

            {/* Rota ortogonal pelos corredores (Modo Navegação) */}
            {!isHeatmap &&
              route &&
              route.segments.map((seg, idx) => {
                const isCompletedSeg =
                  typeof activeStopIndex === "number" && idx < activeStopIndex;
                return (
                  <path
                    key={`seg-${idx}`}
                    d={pointsToPath(seg)}
                    fill="none"
                    stroke={isCompletedSeg ? "#3B6609" : "#78BE20"}
                    strokeWidth={isCompletedSeg ? 1.25 : 1.15}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    strokeDasharray={isCompletedSeg ? undefined : "2.2 1.4"}
                  />
                );
              })}

            {!isHeatmap &&
              route &&
              route.orderedStops.map((stopId, idx) => {
                const aisle = getAisleById(stopId);
                if (!aisle) return null;
                const isCurrent = idx === activeStopIndex;
                const isPast =
                  typeof activeStopIndex === "number" && idx < activeStopIndex;
                return (
                  <g key={`wp-${stopId}-${idx}`}>
                    {isCurrent && (
                      <circle
                        cx={aisle.accessX}
                        cy={aisle.accessY}
                        r={3.5}
                        fill="#78BE20"
                        opacity={0.34}
                      >
                        <animate
                          attributeName="r"
                          values="2.2;4.8;2.2"
                          dur="1.4s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="opacity"
                          values="0.52;0.08;0.52"
                          dur="1.4s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                    <circle
                      cx={aisle.accessX}
                      cy={aisle.accessY}
                      r={isCurrent ? 1.85 : 1.2}
                      fill={isCurrent ? "#111315" : isPast ? "#3B6609" : "#78BE20"}
                      stroke="#FFFFFF"
                      strokeWidth={0.5}
                    />
                  </g>
                );
              })}

            {/* Marcador VOCÊ AQUI */}
            {!isHeatmap && currentAisle && (
              <g
                transform={`translate(${Math.min(
                  Math.max(currentAisle.accessX, 13),
                  MAP_VIEW_W - 14
                )}, ${Math.max(currentAisle.accessY - 3.6, 5)})`}
              >
                <rect
                  x="-10.5"
                  y="-3.1"
                  width="21"
                  height="4.4"
                  rx="0.9"
                  fill="#111315"
                  stroke="#78BE20"
                  strokeWidth="0.4"
                />
                <text
                  y="-0.15"
                  fontSize="1.85"
                  fontWeight="800"
                  textAnchor="middle"
                  fill="#78BE20"
                  style={{ fontFamily: "var(--font-mono), monospace" }}
                >
                  VOCÊ AQUI
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Legenda arquitetônica */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rule bg-white px-4 py-2.5 font-mono text-[10.5px] text-signage-muted">
        {isHeatmap ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#E5E7EB]" />
              Baixa
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-leroy" />
              Média
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#D97706]" />
              Alta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#B91C1C]" />
              Pico de demanda
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-signage" />
              Entrada / Caixas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-leroy" />
              Seus corredores
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#97C95C] bg-[#E9F5DC]" />
              Jardim / Serviços
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-[#D97706] bg-[#FEF3C7]" />
              Drive-Thru
            </span>
          </div>
        )}
        <span className="text-[10px] text-signage-subtle">
          {isHeatmap
            ? "Calor em tempo real · Vitória ES"
            : "Toque em um corredor destacado"}
        </span>
      </div>
    </div>
  );
}
