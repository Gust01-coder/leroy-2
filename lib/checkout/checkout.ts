import type { ProjectItem } from "../types";

export type FulfillmentMode = "scan_and_go" | "clique_retire" | "entrega";
export type PaymentMethod = "pix" | "cartao" | "totem";

export type InstallmentOption = {
  count: number;
  installmentValue: number;
  total: number;
  label: string;
};

export type CheckoutTotals = {
  materialsSubtotal: number;
  installTotal: number;
  deliveryFee: number;
  freeDeliveryUnlocked: boolean;
  pixDiscount: number;
  grandTotal: number;
  clubPoints: number;
  hasHeavyItems: boolean;
  installments: InstallmentOption[];
};

export type CompletedOrder = {
  code: string;
  exitPin: string;
  storeId: string;
  storeName: string;
  projectId: string;
  projectTitle: string;
  fulfillment: FulfillmentMode;
  paymentMethod: PaymentMethod;
  installmentCount: number;
  includeInstall: boolean;
  installSlot?: string;
  deliveryAddress?: string;
  cpfOnReceipt?: string;
  clubMember: boolean;
  clubPoints: number;
  itemsCount: number;
  materialsSubtotal: number;
  installTotal: number;
  deliveryFee: number;
  pixDiscount: number;
  grandTotal: number;
  pixPayload: string;
  createdAt: number;
};

export const PIX_DISCOUNT_RATE = 0.05;
export const FREE_DELIVERY_THRESHOLD = 299;
export const STANDARD_DELIVERY_FEE = 19.9;
export const MIN_INSTALLMENT_BRL = 30;
export const MAX_INSTALLMENTS = 10;

const HEAVY_KEYWORDS = ["18l", "6kg", "prateleira", "impermeabilizante", "massa", "lata"];

export function detectHeavyLoad(items: ProjectItem[]): boolean {
  return items.some((item) => {
    const haystack = `${item.name} ${item.productId}`.toLowerCase();
    return HEAVY_KEYWORDS.some((kw) => haystack.includes(kw)) || item.quantity >= 6;
  });
}

function roundBRL(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildInstallmentOptions(total: number): InstallmentOption[] {
  const safeTotal = Math.max(0, roundBRL(total));
  const maxAllowed = Math.min(
    MAX_INSTALLMENTS,
    Math.max(1, Math.floor(safeTotal / MIN_INSTALLMENT_BRL))
  );
  const options: InstallmentOption[] = [];
  for (let count = 1; count <= maxAllowed; count++) {
    const installmentValue = roundBRL(safeTotal / count);
    options.push({
      count,
      installmentValue,
      total: safeTotal,
      label:
        count === 1
          ? `1× de ${formatBRL(safeTotal)} (à vista)`
          : `${count}× de ${formatBRL(installmentValue)} sem juros`,
    });
  }
  return options;
}

export function computeCheckoutTotals(params: {
  items: ProjectItem[];
  installPrice?: number;
  includeInstall: boolean;
  fulfillment: FulfillmentMode;
  paymentMethod: PaymentMethod;
}): CheckoutTotals {
  const materialsSubtotal = roundBRL(
    params.items.reduce((sum, it) => sum + it.price * it.quantity, 0)
  );
  const installTotal = params.includeInstall ? roundBRL(params.installPrice ?? 0) : 0;
  const baseSum = roundBRL(materialsSubtotal + installTotal);

  const freeDeliveryUnlocked = baseSum >= FREE_DELIVERY_THRESHOLD;
  const deliveryFee =
    params.fulfillment === "entrega" && !freeDeliveryUnlocked
      ? STANDARD_DELIVERY_FEE
      : 0;

  const pixDiscount =
    params.paymentMethod === "pix" ? roundBRL(baseSum * PIX_DISCOUNT_RATE) : 0;

  const grandTotal = roundBRL(Math.max(0, baseSum - pixDiscount + deliveryFee));
  const clubPoints = Math.max(0, Math.floor(grandTotal));
  const hasHeavyItems = detectHeavyLoad(params.items);
  const installments = buildInstallmentOptions(roundBRL(baseSum + deliveryFee));

  return {
    materialsSubtotal,
    installTotal,
    deliveryFee,
    freeDeliveryUnlocked,
    pixDiscount,
    grandTotal,
    clubPoints,
    hasHeavyItems,
    installments,
  };
}

export function buildPixPayload(orderCode: string, amount: number, city = "VITORIA"): string {
  const cleanCity = city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9 ]/gi, "")
    .toUpperCase()
    .slice(0, 15) || "VITORIA";
  const amountStr = amount.toFixed(2);
  const txid = orderCode.replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 20);
  return `00020126580014BR.GOV.BCB.PIX0136lm-copiloto-demo@leroymerlin.com.br52040000530398654${String(
    amountStr.length
  ).padStart(2, "0")}${amountStr}5802BR5921LEROY MERLIN COPILOTO60${String(
    cleanCity.length
  ).padStart(2, "0")}${cleanCity}62${String(txid.length + 4).padStart(2, "0")}05${String(
    txid.length
  ).padStart(2, "0")}${txid}6304DEMO`;
}

export function generateOrderCode(storeId: string): { code: string; exitPin: string } {
  const prefix =
    storeId === "es-vitoria" ? "VIT" : storeId === "sp-tiete" ? "TIE" : "BAR";
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  return { code: `LM-${prefix}-${pin}`, exitPin: pin };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const ORDERS_STORAGE_KEY = "lm_copiloto_orders_v1";

export function saveCompletedOrder(order: CompletedOrder): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredOrders();
    const next = [order, ...existing.filter((o) => o.code !== order.code)].slice(0, 20);
    window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage indisponivel
  }
}

export function getStoredOrders(): CompletedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
