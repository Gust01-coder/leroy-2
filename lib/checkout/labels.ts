import type { FulfillmentMode, PaymentMethod } from "./checkout";

export function fulfillmentLabel(mode: FulfillmentMode): string {
  if (mode === "scan_and_go") return "Sair sem fila";
  if (mode === "clique_retire") return "Clique & Retire";
  return "Entrega expressa";
}

export function paymentLabel(method: PaymentMethod): string {
  if (method === "pix") return "Pix Instantâneo";
  if (method === "cartao") return "Cartão de Crédito";
  return "Totem / Celebre";
}
