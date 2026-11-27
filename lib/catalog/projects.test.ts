import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPaintingProject, equivalentQuantity } from "./projects";

const paint = (widthM: number, lengthM: number, color: "azul" | "branco", finish: "fosco" | "acetinado", includeCeiling = false) =>
  buildPaintingProject({ storeId: "es-vitoria", widthM, lengthM, color, finish, includeCeiling }).items.filter((i) =>
    i.productId.startsWith("tin-acrilica")
  );
const liters = (id: string) => (id.includes("18l") ? 18 : 3.6);

test("quarto pequeno azul usa galoes de 3,6 L, nao lata de 18 L", () => {
  assert.deepEqual(paint(3, 3, "azul", "fosco").map((i) => [i.productId, i.quantity]), [["tin-acrilica-36l-azul", 2]]);
});

test("branco fosco nunca vira acetinado, mesmo em comodo grande", () => {
  const items = paint(6, 8, "branco", "fosco");
  assert.ok(items.every((i) => i.productId === "tin-acrilica-36l-branco"));
});

test("combinacao cobre os litros pelo menor preco", () => {
  // 4x5 m: ~11 L. 1 lata de 18 L (279,90) sai mais barata que 4 galoes (359,60).
  assert.deepEqual(paint(4, 5, "azul", "fosco").map((i) => [i.productId, i.quantity]), [["tin-acrilica-18l-azul", 1]]);
});

test("teto azul nao conta a area duas vezes", () => {
  const items = paint(4, 5, "azul", "fosco", true);
  const azul = items.filter((i) => i.productId.includes("azul")).reduce((s, i) => s + liters(i.productId) * i.quantity, 0);
  const branco = items.filter((i) => i.productId.includes("branco")).reduce((s, i) => s + liters(i.productId) * i.quantity, 0);
  assert.ok(azul >= 11 && azul < 18 + 3.6, `azul ${azul} L`);
  assert.ok(branco >= 4.2 && branco <= 7.2, `branco ${branco} L`);
});

test("substituir embalagem mantem o volume", () => {
  assert.equal(equivalentQuantity(1, "lata 18L", "galão 3,6L"), 5);
  assert.equal(equivalentQuantity(2, "galão 3,6L", "galão 3,6L"), 2);
  assert.equal(equivalentQuantity(3, "kit 12 pçs", "pacote 50 pçs"), 3);
});
