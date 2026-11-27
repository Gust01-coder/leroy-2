// Roda eval/golden.json contra o motor do chat e mede acerto por categoria.
// Uso: npm run eval            (motor local)
//      npm run eval -- --llm   (modelo; exige GEMINI_API_KEY)
import { readFileSync } from "node:fs";
import { INITIAL_CONTEXT, processCopilotMessage, type CopilotReplyPayload } from "../lib/ai/copilotEngine";
import { processWithLlm } from "../lib/ai/copilotLlm";

type Case = { cat: string; q: string; ok: string[]; ids?: string[]; safety?: string };
const cases: Case[] = JSON.parse(readFileSync(new URL("../eval/golden.json", import.meta.url), "utf8"));
const useLlm = process.argv.includes("--llm");
if (useLlm && !process.env.GEMINI_API_KEY) throw new Error("--llm exige GEMINI_API_KEY");

function kind(r: CopilotReplyPayload) {
  if (r.response.handoffTicket) return "chamado";
  if (r.response.actionProject) return "lista";
  return "resposta";
}

function idsHit(r: CopilotReplyPayload, expected: string[]) {
  const p = r.response.actionProject;
  if (!p) return true; // sem lista nao ha id para conferir
  const got = [p.id, p.sourceIntent, ...p.items.map((i) => i.productId)];
  return expected.some((e) => got.some((g) => g.startsWith(e)));
}

async function main() {
  const ctx = { ...INITIAL_CONTEXT, storeId: "es-vitoria" };
  const byCat = new Map<string, { n: number; ok: number }>();
  const failures: string[] = [];
  let unsafe = 0;

  for (const c of cases) {
    const r = useLlm ? await processWithLlm(c.q, [], { ...ctx }) : processCopilotMessage(c.q, { ...ctx });
    const k = kind(r);
    const pass = c.ok.includes(k) && idsHit(r, c.ids ?? []);
    if (c.safety === "gas" && k === "lista") unsafe++;
    const s = byCat.get(c.cat) ?? { n: 0, ok: 0 };
    s.n++;
    if (pass) s.ok++;
    byCat.set(c.cat, s);
    if (!pass) {
      const p = r.response.actionProject;
      failures.push(`  ${c.q}\n    esperado ${c.ok.join("|")}${c.ids ? ` (${c.ids[0]}...)` : ""}, veio ${k}${p ? ` (${p.items.map((i) => i.productId).slice(0, 3).join(", ")})` : ""}`);
    }
  }

  const total = cases.length;
  const ok = [...byCat.values()].reduce((s, v) => s + v.ok, 0);
  console.log(`Motor: ${useLlm ? "modelo" : "local"} | ${ok}/${total} (${Math.round((ok / total) * 100)}%) | gas virou lista: ${unsafe}\n`);
  for (const [cat, s] of byCat) console.log(`${cat.padEnd(14)} ${s.ok}/${s.n}`);
  if (failures.length) console.log(`\nFalhas:\n${failures.join("\n")}`);
  if (unsafe > 0) process.exitCode = 1;
}

main();
