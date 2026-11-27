#!/usr/bin/env node
/**
 * Bloqueia commits ou builds caso alguma chave API, credencial de banco
 * ou arquivo .env (exceto .env.example) esteja rastreado ou em stage no Git.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const BINARY_EXT = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".ico", ".svg", ".pdf", ".zip", ".woff2",
]);

const RULES = [
  { name: "Chave Gemini/Google (AQ.*)", regex: /\bAQ\.[A-Za-z0-9_-]{20,}\b/ },
  { name: "Chave Google API (AIza*)", regex: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: "Credencial Postgres na URL", regex: /postgres(?:ql)?:\/\/[^/\s:@]+:[^/\s@]+@/i },
  { name: "Variável NEXT_PUBLIC_ com segredo", regex: /\bNEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD|DATABASE_URL)\b/ },
];

function gitFiles(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const files = Array.from(
  new Set([
    ...gitFiles(["ls-files"]),
    ...gitFiles(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]),
  ])
);

const errors = [];

for (const rel of files) {
  const norm = rel.replace(/\\/g, "/");
  if (norm === "scripts/check-secrets.mjs") continue;

  const base = path.basename(norm);
  if ((base === ".env" || base.startsWith(".env.")) && base !== ".env.example") {
    errors.push(`${norm}: arquivo de ambiente sensível não pode ir para o Git`);
    continue;
  }

  if (BINARY_EXT.has(path.extname(base).toLowerCase())) continue;
  if (!existsSync(rel)) continue;

  const content = readFileSync(rel, "utf8");
  for (const rule of RULES) {
    if (rule.regex.test(content)) {
      errors.push(`${norm}: detectado possível segredo (${rule.name})`);
    }
  }
}

if (errors.length > 0) {
  console.error("\n[BLOQUEADO] Possível vazamento de segredo detectado:\n");
  for (const err of errors) console.error(`  - ${err}`);
  console.error("\nMova chaves apenas para .env.local (ignorado pelo Git) ou Vercel Environment Variables.\n");
  process.exit(1);
}

console.log(`[OK] Verificacao de segredos aprovada (${files.length} arquivos analisados, 0 vazamentos).`);
