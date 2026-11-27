import { GoogleGenAI, ThinkingLevel, type ContentListUnion } from "@google/genai";

export const CHAT_MODEL = "gemini-3.5-flash-lite";
export const VISION_MODEL = "gemini-3.8-flash";

const DEFAULT_TIMEOUT_MS = 8000;

let client: GoogleGenAI | null = null;

export function isLlmEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Uma chamada com saida JSON restrita ao schema. Lanca erro em timeout,
 * falha de rede ou JSON invalido: quem chama decide o fallback.
 */
export async function generateJson(params: {
  model: string;
  systemInstruction: string;
  contents: ContentListUnion;
  schema: object;
  timeoutMs?: number;
  thinkingLevel?: ThinkingLevel;
}): Promise<unknown> {
  if (typeof window !== "undefined") {
    throw new Error("lib/llm.ts só pode ser executado no servidor.");
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const thinkingLevel =
    params.thinkingLevel ??
    (params.model === VISION_MODEL ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL);

  const response = await client.models.generateContent({
    model: params.model,
    contents: params.contents,
    config: {
      systemInstruction: params.systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: params.schema,
      temperature: 0.2,
      maxOutputTokens: thinkingLevel === ThinkingLevel.MINIMAL ? 1024 : 2048,
      thinkingConfig: { thinkingLevel },
      abortSignal: AbortSignal.timeout(params.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    },
  });

  const text = response.text;
  if (!text) throw new Error("Resposta vazia do modelo");
  return JSON.parse(text);
}
