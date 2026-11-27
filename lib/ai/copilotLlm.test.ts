import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReply, parseDecision } from "./copilotLlm";
import { INITIAL_CONTEXT } from "./copilotEngine";

const ctx = { ...INITIAL_CONTEXT, storeId: "es-vitoria" };
const base = { reply: "Ok.", action: "answer", risk: "nenhum", suggestions: [], productIds: [] };

test("rejeita saida fora do schema", () => {
  assert.equal(parseDecision(null), null);
  assert.equal(parseDecision({ ...base, action: "apagar_banco" }), null);
  assert.equal(parseDecision({ ...base, reply: "" }), null);
});

test("descarta ids de produto inventados", () => {
  const d = parseDecision({ ...base, action: "product_list", productIds: ["fer-furadeira", "produto-fake", "fer-furadeira"] });
  assert.deepEqual(d?.productIds, ["fer-furadeira"]);
});

test("lista so com ids invalidos vira resposta sem lista", () => {
  const d = parseDecision({ ...base, action: "product_list", productIds: ["cimento-cp2"] })!;
  const r = buildReply(d, "quero cimento", ctx);
  assert.equal(r.response.actionProject, undefined);
});

test("gas nunca vira lista de compras, mesmo se o modelo pedir", () => {
  const d = parseDecision({ ...base, action: "product_list", productIds: ["hid-veda-rosca"] })!;
  const r = buildReply(d, "to sentindo cheiro de gas no fogao", ctx);
  assert.equal(r.response.actionProject, undefined);
  assert.match(r.response.text, /Gás não é serviço para fazer sozinho/);
});

test("eletrica ganha aviso de seguranca e oferta de especialista", () => {
  const d = parseDecision({ ...base, action: "preset_project", presetProjectId: "troca-resistencia", suggestions: ["a", "b", "c"] })!;
  const r = buildReply(d, "meu chuveiro parou de esquentar", ctx);
  assert.ok(r.response.actionProject);
  assert.match(r.response.text, /disjuntor/);
  assert.ok(r.response.suggestions?.includes("Chamar especialista"));
  assert.equal(r.response.suggestions?.length, 3);
});

test("medidas de pintura absurdas sao limitadas", () => {
  const d = parseDecision({ ...base, action: "paint_project", paint: { widthM: 900, lengthM: -3, includeCeiling: false, color: "roxo", finish: "x" } })!;
  assert.deepEqual(d.paint, { widthM: 30, lengthM: 1, includeCeiling: false, color: "azul", finish: "fosco" });
});

test("handoff gera chamado com especialista do departamento", () => {
  const d = parseDecision({ ...base, action: "handoff", department: "Hidráulica" })!;
  const r = buildReply(d, "quero falar com alguem", ctx);
  assert.equal(r.response.handoffTicket?.category, "Hidráulica");
  assert.match(r.response.handoffTicket!.id, /^LM-[0-9A-F]{8}$/);
});
