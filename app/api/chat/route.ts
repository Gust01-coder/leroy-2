import { NextResponse } from "next/server";
import { INITIAL_CONTEXT, processCopilotMessage, type CopilotReplyPayload } from "@/lib/ai/copilotEngine";
import { processWithLlm, type ChatTurn } from "@/lib/ai/copilotLlm";
import { CHAT_MODEL, isLlmEnabled } from "@/lib/ai/llm";
import { isRateLimited } from "@/lib/server/rateLimit";
import { saveTicket } from "@/lib/server/serverStore";
import { DEFAULT_STORE_ID } from "@/lib/store/stores";
import { ChatContext } from "@/lib/types";

const MAX_MESSAGE = 500;
const MAX_TURNS = 8;

type ChatRequestBody = {
  message?: string;
  context?: ChatContext;
  storeId?: string;
  history?: unknown;
};

function sanitizeTurns(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (t): t is ChatTurn =>
        !!t && (t.role === "user" || t.role === "assistant") && typeof t.text === "string" && t.text.trim() !== ""
    )
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, text: t.text.slice(0, MAX_MESSAGE) }));
}

export async function POST(req: Request) {
  if (isRateLimited(req)) {
    return NextResponse.json({ error: "Muitas mensagens seguidas. Aguarde um minuto." }, { status: 429 });
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: `Mensagem acima de ${MAX_MESSAGE} caracteres` }, { status: 400 });
  }

  const baseCtx: ChatContext = body.context ?? {
    ...INITIAL_CONTEXT,
    storeId: body.storeId || DEFAULT_STORE_ID,
  };
  if (body.storeId) {
    baseCtx.storeId = body.storeId;
  }

  let result: CopilotReplyPayload | null = null;
  let engine = "local";
  if (isLlmEnabled()) {
    try {
      result = await processWithLlm(message, sanitizeTurns(body.history), baseCtx);
      engine = CHAT_MODEL;
    } catch (err) {
      // Sem conteudo do cliente no log: so o motivo da falha.
      console.warn("[chat] fallback para motor local:", err instanceof Error ? err.message : err);
    }
  }
  result ??= processCopilotMessage(message, baseCtx);

  // O chamado nasce aqui, no servidor: o painel da loja le daqui, nao do aparelho do cliente.
  const ticket = result.response.handoffTicket;
  if (ticket) {
    try {
      await saveTicket(ticket);
    } catch (err) {
      console.warn("[chat] falha ao gravar chamado:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({
    response: result.response,
    context: result.newContext,
    painTopic: result.painTopic,
    unmet: result.unmet,
    engine,
  });
}
