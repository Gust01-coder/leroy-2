import { Aisle, RoutePoint } from "./types";

/**
 * Planta arquitetônica 2D inspirada na unidade real:
 * Leroy Merlin Vitória — Av. Fernando Ferrari, 2600 (próx. Jardim Camburi / Aeroporto, ES)
 * ~15.700 m² · 15 grandes departamentos · Drive-Thru · Fábrica de Cores · Corte de Madeira · Clique & Retire
 */
export const MAP_VIEW_W = 168;
export const MAP_VIEW_H = 112;

// Vias ortogonais de circulação livres (Alameda Frontal, Avenida Transversal e Via de Fundo)
const FRONT_BOULEVARD_Y = 73.5;
const MID_BOULEVARD_Y = 42.5;
const BACK_BOULEVARD_Y = 12;

const LANE_H_X = 27.5; // Via vertical Hidráulica / Banheiros
const LANE_T_X = 57.5; // Via vertical Tintas / Fábrica de Cores
const LANE_F_X = 87.5; // Via vertical Ferramentas / Fixação
const LANE_E_X = 117.5; // Via vertical Elétrica / Iluminação / Limpeza
const LANE_M_X = 142.5; // Via vertical Materiais Básicos / Drive-Thru

export type ArchitecturalZone = {
  id: string;
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  tone: "garden" | "showroom" | "service" | "drivethru" | "neutral";
};

/**
 * Zonas arquitetônicas e serviços reais da Leroy Merlin Vitória que dão contexto
 * espacial completo ao salão de 15.700m².
 */
export const ARCHITECTURAL_ZONES: ArchitecturalZone[] = [
  // Ala Esquerda — Jardim, Decoração e Pisos
  {
    id: "zone-pisos",
    label: "PISOS & REVESTIMENTOS",
    sublabel: "Porcelanatos · Laminados",
    x: 4,
    y: 15,
    width: 20.5,
    height: 17,
    tone: "showroom",
  },
  {
    id: "zone-decoracao",
    label: "DECORAÇÃO",
    sublabel: "Organização · Tapetes",
    x: 4,
    y: 34,
    width: 20.5,
    height: 15,
    tone: "neutral",
  },
  {
    id: "zone-jardim",
    label: "JARDIM & VARANDA",
    sublabel: "Área Externa · Plantas",
    x: 4,
    y: 51,
    width: 20.5,
    height: 19,
    tone: "garden",
  },

  // Fundos / Serviços Especializados da Unidade Vitória
  {
    id: "svc-banho-showroom",
    label: "BANHEIROS & COZINHAS",
    sublabel: "Showroom Sensea · Louças",
    x: 30,
    y: 15,
    width: 24,
    height: 10.5,
    tone: "showroom",
  },
  {
    id: "svc-fabrica-cores",
    label: "FÁBRICA DE CORES",
    sublabel: "Máquina Tintométrica",
    x: 60,
    y: 15,
    width: 24,
    height: 10.5,
    tone: "service",
  },
  {
    id: "svc-bricolagem",
    label: "MESA DE BRICOLAGEM",
    sublabel: "Corte Vidro · Projetos",
    x: 90,
    y: 15,
    width: 24,
    height: 10.5,
    tone: "service",
  },
  {
    id: "svc-ar-pet",
    label: "AR, VENTILAÇÃO & PET",
    sublabel: "Climatização · Utilidades",
    x: 120,
    y: 15,
    width: 19.5,
    height: 10.5,
    tone: "neutral",
  },

  // Ala Direita — Madeiras, Portas e Drive-Thru Construção
  {
    id: "svc-madeiras",
    label: "MADEIRAS & CORTE",
    sublabel: "Corte sob medida",
    x: 145.5,
    y: 15,
    width: 18.5,
    height: 14,
    tone: "service",
  },
  {
    id: "zone-portas",
    label: "PORTAS & JANELAS",
    sublabel: "Esquadrias · Portões",
    x: 145.5,
    y: 45,
    width: 18.5,
    height: 11.5,
    tone: "showroom",
  },
  {
    id: "zone-drivethru",
    label: "DRIVE-THRU OBRA",
    sublabel: "Acesso Veículos · Carga",
    x: 145.5,
    y: 58.5,
    width: 18.5,
    height: 11.5,
    tone: "drivethru",
  },

  // Frente de loja — Serviços complementares
  {
    id: "front-clique",
    label: "CLIQUE & RETIRE",
    x: 96,
    y: 78,
    width: 21,
    height: 8,
    tone: "service",
  },
];

export const AISLES: Aisle[] = [
  // ================= FRENTE DE LOJA (Av. Fernando Ferrari) =================
  {
    id: "ENTRY",
    label: "Entrada Principal (Av. Fernando Ferrari)",
    shortLabel: "Entrada",
    department: "Acesso",
    x: 14,
    y: 78,
    width: 24,
    height: 8,
    accessX: 26,
    accessY: FRONT_BOULEVARD_Y,
  },
  {
    id: "CHECKOUT",
    label: "Caixas & Autoatendimento",
    shortLabel: "Caixas · Self",
    department: "Finalização",
    x: 45,
    y: 78,
    width: 45,
    height: 8,
    accessX: 67.5,
    accessY: FRONT_BOULEVARD_Y,
  },
  {
    id: "DESK",
    label: "Balcão Leroy Merlin Instala & Projetos",
    shortLabel: "Leroy Instala",
    department: "Serviços",
    x: 122,
    y: 78,
    width: 30,
    height: 8,
    accessX: 137,
    accessY: FRONT_BOULEVARD_Y,
  },

  // ================= SETOR HIDRÁULICA (Corredores C03–C05) =================
  {
    id: "H1",
    corridorNumber: "C03",
    label: "Corredor C03 · Torneiras & Metais Sensea",
    shortLabel: "Torneiras",
    department: "Hidráulica",
    x: 30,
    y: 29,
    width: 24,
    height: 10,
    accessX: LANE_H_X,
    accessY: 34,
  },
  {
    id: "H2",
    corridorNumber: "C04",
    label: "Corredor C04 · Tubos, Sifões & Engates",
    shortLabel: "Tubos/Sifões",
    department: "Hidráulica",
    x: 30,
    y: 46,
    width: 24,
    height: 10,
    accessX: LANE_H_X,
    accessY: 51,
  },
  {
    id: "H3",
    corridorNumber: "C05",
    label: "Corredor C05 · Vedação & Reparos",
    shortLabel: "Vedação",
    department: "Hidráulica",
    x: 30,
    y: 59,
    width: 24,
    height: 10,
    accessX: LANE_H_X,
    accessY: 64,
  },

  // ================= SETOR TINTAS (Corredores C08–C10) =================
  {
    id: "T1",
    corridorNumber: "C08",
    label: "Corredor C08 · Acessórios Pintura Dexter",
    shortLabel: "Acessórios",
    department: "Tintas",
    x: 60,
    y: 29,
    width: 24,
    height: 10,
    accessX: LANE_T_X,
    accessY: 34,
  },
  {
    id: "T2",
    corridorNumber: "C09",
    label: "Corredor C09 · Tintas Luxens & Suvinil",
    shortLabel: "Tintas",
    department: "Tintas",
    x: 60,
    y: 46,
    width: 24,
    height: 10,
    accessX: LANE_T_X,
    accessY: 51,
  },
  {
    id: "T3",
    corridorNumber: "C10",
    label: "Corredor C10 · Seladores & Preparação",
    shortLabel: "Seladores",
    department: "Tintas",
    x: 60,
    y: 59,
    width: 24,
    height: 10,
    accessX: LANE_T_X,
    accessY: 64,
  },

  // ================= SETOR FERRAMENTAS & FIXAÇÃO (Corredores C14–C16) =================
  {
    id: "F1",
    corridorNumber: "C14",
    label: "Corredor C14 · Ferramentas Manuais Dexter",
    shortLabel: "Manuais",
    department: "Ferramentas",
    x: 90,
    y: 29,
    width: 24,
    height: 10,
    accessX: LANE_F_X,
    accessY: 34,
  },
  {
    id: "F2",
    corridorNumber: "C15",
    label: "Corredor C15 · Furadeiras & Brocas Dexter",
    shortLabel: "Elétricas",
    department: "Ferramentas",
    x: 90,
    y: 46,
    width: 24,
    height: 10,
    accessX: LANE_F_X,
    accessY: 51,
  },
  {
    id: "F3",
    corridorNumber: "C16",
    label: "Corredor C16 · Buchas Standers & Spaceo",
    shortLabel: "Fixação",
    department: "Fixação",
    x: 90,
    y: 59,
    width: 24,
    height: 10,
    accessX: LANE_F_X,
    accessY: 64,
  },

  // ================= SETOR ELÉTRICA, ILUMINAÇÃO & LIMPEZA (C19–C21) =================
  {
    id: "E1",
    corridorNumber: "C19",
    label: "Corredor C19 · Chuveiros Lorenzetti & Wago",
    shortLabel: "Elétrica",
    department: "Elétrica",
    x: 120,
    y: 29,
    width: 19.5,
    height: 10,
    accessX: LANE_E_X,
    accessY: 34,
  },
  {
    id: "E2",
    corridorNumber: "C20",
    label: "Corredor C20 · Showroom Iluminação",
    shortLabel: "Iluminação",
    department: "Elétrica",
    x: 120,
    y: 46,
    width: 19.5,
    height: 10,
    accessX: LANE_E_X,
    accessY: 51,
  },
  {
    id: "L2",
    corridorNumber: "C21",
    label: "Corredor C21 · Limpeza, Mofo & EPIs",
    shortLabel: "Limpeza",
    department: "Limpeza",
    x: 120,
    y: 59,
    width: 19.5,
    height: 10,
    accessX: LANE_E_X,
    accessY: 64,
  },

  // ================= SETOR MATERIAIS DE CONSTRUÇÃO (C24 / Ala Drive-Thru) =================
  {
    id: "M4",
    corridorNumber: "C24",
    label: "Corredor C24 · Materiais Básicos Axton & Obra",
    shortLabel: "Obra/Axton",
    department: "Materiais Básicos",
    x: 145.5,
    y: 31,
    width: 18.5,
    height: 11.5,
    accessX: LANE_M_X,
    accessY: 36.75,
  },
];

export function getAisleById(id: string): Aisle | undefined {
  return AISLES.find((a) => a.id === id);
}

/** Codigo da placa do corredor (C05); o id do setor (H3) fica interno. */
export function corridorOf(aisleId: string): string {
  return getAisleById(aisleId)?.corridorNumber ?? aisleId;
}

/**
 * Conecta dois pontos respeitando as 3 alamedas horizontais (Frontal, Central e Fundo)
 * e as vias verticais de corredor — zero cruzamento sobre gôndolas.
 */
function connectOrthogonal(from: RoutePoint, to: RoutePoint): RoutePoint[] {
  if (Math.abs(from.x - to.x) < 0.5) return [to];
  if (Math.abs(from.y - to.y) < 0.5) return [to];

  const candidates = [FRONT_BOULEVARD_Y, MID_BOULEVARD_Y, BACK_BOULEVARD_Y];
  let bestY = FRONT_BOULEVARD_Y;
  let bestCost = Infinity;

  for (const cy of candidates) {
    const cost = Math.abs(from.y - cy) + Math.abs(to.y - cy);
    if (cost < bestCost) {
      bestCost = cost;
      bestY = cy;
    }
  }

  const pts: RoutePoint[] = [];
  if (Math.abs(from.y - bestY) > 0.5) {
    pts.push({ x: from.x, y: bestY });
  }
  pts.push({ x: to.x, y: bestY });
  if (Math.abs(to.y - bestY) > 0.5) {
    pts.push({ x: to.x, y: to.y });
  }
  return pts;
}

function manhattanWalkCost(a: Aisle, b: Aisle): number {
  const pts = connectOrthogonal(
    { x: a.accessX, y: a.accessY },
    { x: b.accessX, y: b.accessY }
  );
  let dist = 0;
  let prev = { x: a.accessX, y: a.accessY };
  for (const p of pts) {
    dist += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return dist;
}

export function optimizeAisleOrder(aisleIds: string[]): string[] {
  const unique = Array.from(
    new Set(
      aisleIds.filter(
        (id) => id !== "ENTRY" && id !== "CHECKOUT" && getAisleById(id)
      )
    )
  );
  if (unique.length <= 1) return unique;

  const remaining = [...unique];
  const ordered: string[] = [];
  let current = getAisleById("ENTRY")!;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = getAisleById(remaining[i])!;
      const cost = manhattanWalkCost(current, candidate);
      if (cost < bestDist) {
        bestDist = cost;
        bestIdx = i;
      }
    }
    const chosenId = remaining.splice(bestIdx, 1)[0];
    ordered.push(chosenId);
    current = getAisleById(chosenId)!;
  }

  return ordered;
}

export type ComputedStoreRoute = {
  orderedStops: string[];
  segments: RoutePoint[][];
  fullPath: RoutePoint[];
  totalMeters: number;
  estimatedMinutes: number;
};

export function computeStoreRoute(aisleIds: string[]): ComputedStoreRoute {
  const optimized = optimizeAisleOrder(aisleIds);
  const orderedStops = ["ENTRY", ...optimized, "CHECKOUT"];
  const segments: RoutePoint[][] = [];
  const fullPath: RoutePoint[] = [];

  let totalUnits = 0;

  for (let i = 0; i < orderedStops.length - 1; i++) {
    const a = getAisleById(orderedStops[i]);
    const b = getAisleById(orderedStops[i + 1]);
    if (!a || !b) continue;

    const startPt: RoutePoint = { x: a.accessX, y: a.accessY };
    const endPt: RoutePoint = { x: b.accessX, y: b.accessY };
    const segPts = [startPt, ...connectOrthogonal(startPt, endPt)];
    segments.push(segPts);

    for (let j = 0; j < segPts.length; j++) {
      if (i === 0 || j > 0) fullPath.push(segPts[j]);
      if (j > 0) {
        totalUnits += Math.hypot(
          segPts[j].x - segPts[j - 1].x,
          segPts[j].y - segPts[j - 1].y
        );
      }
    }
  }

  // Escala proporcional à megaloja de 15.700m² (1 unidade ≈ 0.92m)
  const totalMeters = Math.max(32, Math.round(totalUnits * 0.92));
  const estimatedMinutes = Math.max(
    1,
    Math.round(totalMeters / 55 + optimized.length * 0.65)
  );

  return {
    orderedStops,
    segments,
    fullPath,
    totalMeters,
    estimatedMinutes,
  };
}
