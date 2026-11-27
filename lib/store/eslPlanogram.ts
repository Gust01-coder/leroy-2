import { CATALOG, getStockForStore } from "../catalog/catalog";
import { Product, ProjectItem } from "../types";

export type EslSlot = {
  shelfLevel: 3 | 2 | 1; // 3 = superior (altura dos olhos), 2 = média, 1 = inferior
  positionIdx: number; // 0..3
  product: Product;
  stockQty: number;
  isTarget: boolean;
};

export type EslPlanogram = {
  aisle: string;
  moduleLabel: string;
  targetShelfLevel: 3 | 2 | 1;
  targetPositionLabel: string;
  eyeHeightNote: string;
  slots: EslSlot[];
};

function parseShelfLevel(shelfLocation: string): 3 | 2 | 1 {
  const lower = shelfLocation.toLowerCase();
  if (lower.includes("base") || lower.includes("1")) return 1;
  if (lower.includes("2")) return 2;
  return 3;
}

function parseModule(shelfLocation: string): string {
  const match = shelfLocation.match(/M[oó]dulo\s*\d+/i);
  return match ? match[0] : "Módulo 02";
}

/**
 * Gera um planograma realista da gôndola (3 prateleiras × 3 colunas = 9 etiquetas ESL)
 * populado com SKUs vizinhos do mesmo departamento para simular o "Pick-to-Light"
 * (etiqueta eletrônica e-ink piscando LED verde no último metro).
 */
export function buildEslPlanogram(
  item: Pick<ProjectItem, "productId" | "aisle" | "shelfLocation">,
  storeId: string
): EslPlanogram {
  const targetProd = CATALOG.find((p) => p.id === item.productId) ?? CATALOG[0];
  const sameAisle = CATALOG.filter(
    (p) => p.id !== targetProd.id && (p.aisle === targetProd.aisle || p.category === targetProd.category)
  );
  const others = CATALOG.filter(
    (p) => p.id !== targetProd.id && !sameAisle.some((s) => s.id === p.id)
  );
  const neighbors = [...sameAisle, ...others];

  const targetLevel = parseShelfLevel(item.shelfLocation || targetProd.shelfLocation);
  const targetCol = 1; // centro da prateleira para ótima leitura

  const levels: (3 | 2 | 1)[] = [3, 2, 1];
  const slots: EslSlot[] = [];
  let nIdx = 0;

  for (const level of levels) {
    for (let pos = 0; pos < 3; pos++) {
      const isTarget = level === targetLevel && pos === targetCol;
      const prod = isTarget ? targetProd : neighbors[nIdx++ % neighbors.length];
      slots.push({
        shelfLevel: level,
        positionIdx: pos,
        product: prod,
        stockQty: getStockForStore(prod, storeId),
        isTarget,
      });
    }
  }

  const eyeHeightNote =
    targetLevel === 3
      ? "Prateleira superior · Altura dos olhos (~1,55m)"
      : targetLevel === 2
      ? "Prateleira intermediária · Altura da cintura (~1,05m)"
      : "Prateleira base · Nível inferior (~0,45m)";

  return {
    aisle: targetProd.aisle,
    moduleLabel: parseModule(item.shelfLocation || targetProd.shelfLocation),
    targetShelfLevel: targetLevel,
    targetPositionLabel: `Posição central · 2º item da esquerda`,
    eyeHeightNote,
    slots,
  };
}
