import type { Product } from "../types";
import { HIDRAULICA } from "./data/hidraulica";
import { TINTAS } from "./data/tintas";
import { FERRAMENTAS_FIXACAO } from "./data/ferramentas-fixacao";
import { ELETRICA_ILUMINACAO } from "./data/eletrica-iluminacao";
import { MATERIAIS_BASICOS } from "./data/materiais-basicos";
import { LIMPEZA_PROTECAO } from "./data/limpeza-protecao";
import { NOVOS_PROJETOS } from "./data/novos-projetos";

/**
 * Produtos reais do site da Leroy Merlin Brasil: nome oficial, codigo, foto e link
 * vem do sitemap publico de imagens (cdn.leroymerlin.com.br/sitemaps).
 * Precos sao de referencia; estoque, corredor e prateleira sao ilustrativos.
 */
export const CATALOG: Product[] = [
  ...HIDRAULICA,
  ...TINTAS,
  ...FERRAMENTAS_FIXACAO,
  ...ELETRICA_ILUMINACAO,
  ...MATERIAIS_BASICOS,
  ...LIMPEZA_PROTECAO,
  ...NOVOS_PROJETOS,
];

export function getProductById(id: string): Product | undefined {
  return CATALOG.find((p) => p.id === id);
}

export function getStockForStore(product: Product, storeId: string): number {
  return product.stockByStore[storeId] ?? product.stockByStore["es-vitoria"] ?? 0;
}
