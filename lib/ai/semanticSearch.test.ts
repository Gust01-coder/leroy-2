import { test } from "node:test";
import assert from "node:assert/strict";
import { semanticSearchCatalog } from "./semanticSearch";

const STORE = "es-vitoria";
const ids = (q: string) => semanticSearchCatalog(q, STORE, { limit: 5 }).map((m) => m.product.id);

test("recusa conversa e ruido que nao sao pedidos de produto", () => {
  for (const q of ["oi", "bom dia, tudo bem?", "obrigado", "ok", "photo 2026 11 25 jpg", "IMG_1234.jpg"]) {
    assert.deepEqual(ids(q), [], `"${q}" nao deveria retornar produtos`);
  }
});

test("encontra o produto certo em linguagem leiga", () => {
  const casos: Array<[string, string]> = [
    ["torneira pingando", "hid-reparo-univ"],
    ["tem furadeira?", "fer-furadeira"],
    ["meu chuveiro nao esquenta", "ele-resistencia-univ"],
    ["bucha para drywall", "fix-bucha-drywall"],
    ["mofo no banheiro", "lim-removedor-mofo"],
  ];
  for (const [q, esperado] of casos) {
    assert.ok(ids(q).slice(0, 3).includes(esperado), `"${q}" deveria trazer ${esperado} no top 3, veio ${ids(q)}`);
  }
});

test("tolera erro de digitacao", () => {
  assert.ok(ids("torneria").some((id) => id.startsWith("hid-")));
});

test("busca vazia continua listando o catalogo", () => {
  assert.equal(semanticSearchCatalog("", STORE, { limit: 5 }).length, 5);
});
