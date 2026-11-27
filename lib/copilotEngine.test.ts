import { test } from "node:test";
import assert from "node:assert/strict";
import { INITIAL_CONTEXT, processCopilotMessage } from "./copilotEngine";
import type { ChatContext } from "./types";

const ctx: ChatContext = { ...INITIAL_CONTEXT, storeId: "es-vitoria" };
const SCREEN_ACTION = /\bfotos?\b|cat[aá]logo/i; // tratados no chat, nao viram mensagem

test("todo chip oferecido leva a algum lugar", () => {
  const broken: string[] = [];
  const walk = (msg: string, c: ChatContext, depth: number) => {
    const r = processCopilotMessage(msg, c);
    if (r.unmet && depth > 0) broken.push(msg);
    if (depth < 3) for (const s of r.response.suggestions ?? []) if (!SCREEN_ACTION.test(s)) walk(s, r.newContext, depth + 1);
  };
  for (const start of [
    "Minha torneira está pingando",
    "Quero pintar um quarto 4x5m",
    "Quero instalar uma prateleira",
    "Meu chuveiro parou de esquentar",
    "Apareceu uma trinca na parede do banheiro",
  ]) walk(start, ctx, 0);
  assert.deepEqual([...new Set(broken)], []);
});

test("pedir tecnico de eletrica abre chamado, nao lista de faca-voce-mesmo", () => {
  const first = processCopilotMessage("Meu chuveiro parou de esquentar", ctx);
  const r = processCopilotMessage("Chamar técnico de elétrica", first.newContext);
  assert.equal(r.response.actionProject, undefined);
  assert.equal(r.response.handoffTicket?.category, "Elétrica");
});

test("gas nunca vira lista, nem no meio de outro fluxo", () => {
  const ctx = { ...INITIAL_CONTEXT, storeId: "es-vitoria", step: "torneira:onde" as const };
  for (const q of ["cheiro de gás no fogão", "vazamento de gás embaixo da pia", "trocar mangueira do botijão"]) {
    const r = processCopilotMessage(q, ctx);
    assert.equal(r.response.actionProject, undefined, q);
    assert.match(r.response.text, /Gás não é serviço/, q);
  }
});

test("pedido por item especifico devolve a lista com o produto certo, sem pergunta de esclarecimento", () => {
  const cases: Array<[string, string]> = [
    ["preciso de rolo e bandeja pra pintar", "tin-rolo-bandeja"],
    ["fita pra não sujar o rodapé na pintura", "tin-fita-crepe"],
    ["plástico pra proteger o chão quando for pintar", "tin-lona"],
    ["bucha e parafuso pra parede de tijolo", "fix-bucha-s8"],
    ["suporte de mão francesa", "fix-mao-francesa"],
    ["nível pra deixar o quadro reto", "fer-nivel-bolha"],
  ];
  for (const [message, productId] of cases) {
    const r = processCopilotMessage(message, ctx);
    const ids = r.response.actionProject?.items.map((i) => i.productId) ?? [];
    assert.equal(ids[0], productId, message);
  }
});

test("pedido generico continua perguntando antes de listar", () => {
  const r = processCopilotMessage("Quero pintar um quarto", ctx);
  assert.equal(r.response.actionProject, undefined);
});
