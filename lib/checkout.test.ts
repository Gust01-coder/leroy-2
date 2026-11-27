import assert from "node:assert/strict";
import test from "node:test";
import { buildPixPayload, computeCheckoutTotals } from "./checkout";
import { materializeProjectItems } from "./projects";

test("Pix aplica 5% de desconto e scan_and_go tem frete zero", () => {
  const items = materializeProjectItems(
    [{ productId: "hid-torneira-mono", quantity: 1 }],
    "es-vitoria"
  );
  const totals = computeCheckoutTotals({
    items,
    includeInstall: false,
    fulfillment: "scan_and_go",
    paymentMethod: "pix",
  });

  assert.equal(totals.deliveryFee, 0);
  assert.equal(totals.pixDiscount, Math.round(items[0].price * 0.05 * 100) / 100);
  assert.equal(totals.grandTotal, Math.round((items[0].price - totals.pixDiscount) * 100) / 100);
  assert.equal(totals.clubPoints, Math.floor(totals.grandTotal));
});

test("entrega cobra frete abaixo de R$ 299 e zera acima de R$ 299", () => {
  const smallItems = materializeProjectItems(
    [{ productId: "hid-reparo-univ", quantity: 1 }],
    "es-vitoria"
  );
  const small = computeCheckoutTotals({
    items: smallItems,
    includeInstall: false,
    fulfillment: "entrega",
    paymentMethod: "cartao",
  });
  assert.equal(small.freeDeliveryUnlocked, false);
  assert.equal(small.deliveryFee, 19.9);
  assert.equal(small.pixDiscount, 0);

  const bigItems = materializeProjectItems(
    [{ productId: "tin-acrilica-18l-azul", quantity: 2 }],
    "es-vitoria"
  );
  const big = computeCheckoutTotals({
    items: bigItems,
    includeInstall: false,
    fulfillment: "entrega",
    paymentMethod: "cartao",
  });
  assert.equal(big.freeDeliveryUnlocked, true);
  assert.equal(big.deliveryFee, 0);
  assert.equal(big.hasHeavyItems, true);
  assert.equal(big.installments.length, 10);
});

test("Pix copia e cola inclui codigo do pedido e valor formatado", () => {
  const payload = buildPixPayload("LM-VIT-4821", 159.9, "Vitória");
  assert.ok(payload.includes("LMVIT4821"));
  assert.ok(payload.includes("159.90"));
  assert.ok(payload.includes("VITORIA"));
});
