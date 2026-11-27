"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { StoreBar } from "@/components/StoreBar";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingDots } from "@/components/TypingDots";
import { AssistantAvatar } from "@/components/AssistantAvatar";
import { VisionModal, VisionSelection } from "@/components/VisionModal";
import { VoiceButton } from "@/components/VoiceButton";
import { ProductThumb } from "@/components/ProductThumb";
import {
  ArrowRightIcon,
  CameraIcon,
  CheckCircleIcon,
  MapIcon,
  SendIcon,
  ShieldCheckIcon,
  SparkleIcon,
  UserCheckIcon,
} from "@/components/Icons";
import { INITIAL_CONTEXT } from "@/lib/ai/copilotEngine";
import { getStoreById } from "@/lib/store/stores";
import {
  getSelectedStoreId,
  saveDynamicProject,
  saveHandoffTicket,
  trackEvent,
} from "@/lib/telemetry";
import { ChatContext, ChatMessage, DynamicProjectList, VisionAnalysisResult } from "@/lib/types";
import { corridorOf } from "@/lib/store/storeMap";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function projectTotal(p: DynamicProjectList): number {
  return p.items
    .filter((i) => !i.optional)
    .reduce((acc, i) => acc + i.price * i.quantity, 0);
}

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: "Modo Loja conectado. Descreva o que você precisa resolver — por **voz**, **texto** ou **foto da peça**.\n\nEu diagnostico o problema, confiro se as peças combinam entre si, confirmo o estoque desta loja e acendo a etiqueta na prateleira.",
  suggestions: [
    "Minha torneira está pingando",
    "Quero pintar um quarto azul de 4x5m com teto",
    "Quero instalar uma prateleira na parede",
    "Meu chuveiro parou de esquentar",
    "Apareceu uma trinca na parede do banheiro",
  ],
  timestamp: 1,
};

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatInner />
    </Suspense>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-floor">
      <StoreBar />
      <div className="flex flex-1 items-center justify-center">
        <TypingDots />
      </div>
    </div>
  );
}

function ChatInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initialQuery = params.get("q");
  const initialVoice = params.get("voice") === "1";
  const openVisionParam = params.get("vision") === "1";

  const [storeId, setStoreId] = useState("es-vitoria");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [context, setContext] = useState<ChatContext>(INITIAL_CONTEXT);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [visionOpen, setVisionOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialSentRef = useRef(false);
  const sessionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const id = getSelectedStoreId();
    setStoreId(id);
    setContext((prev) => ({ ...prev, storeId: id }));

    const onStore = (e: Event) => {
      const next = (e as CustomEvent<string>).detail;
      if (next) {
        setStoreId(next);
        setContext((prev) => ({ ...prev, storeId: next }));
      }
    };
    window.addEventListener("lm:store-changed", onStore);
    return () => window.removeEventListener("lm:store-changed", onStore);
  }, []);

  useEffect(() => {
    if (openVisionParam) {
      setVisionOpen(true);
    }
  }, [openVisionParam]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    if (initialQuery && !initialSentRef.current) {
      initialSentRef.current = true;
      const t = setTimeout(() => sendMessage(initialQuery, initialVoice), 260);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // Chips que sao acoes de tela, nao mensagens (vindos do motor local ou do modelo).
  function handleSuggestion(text: string) {
    if (/\bfotos?\b/i.test(text)) setVisionOpen(true);
    else if (/cat[aá]logo/i.test(text)) router.push("/catalogo");
    else sendMessage(text);
  }

  async function sendMessage(text: string, viaVoice = false) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const currentStore = getSelectedStoreId();
    const userMessage: ChatMessage = {
      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "user",
      text: trimmed,
      viaVoice,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          context: { ...context, storeId: currentStore },
          storeId: currentStore,
          history: messages.slice(-8).map(({ role, text }) => ({ role, text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const reply = data.response as Omit<ChatMessage, "id" | "role" | "timestamp">;

      if (reply.actionProject) {
        saveDynamicProject(reply.actionProject);
        const firstAisle = reply.actionProject.items[0]?.aisle;
        trackEvent({
          type: "list_generated",
          storeId: currentStore,
          label: `Lista gerada: ${reply.actionProject.title}`,
          aisle: firstAisle,
          painTopic: data.painTopic || reply.actionProject.sourceIntent,
          durationSec: Math.round((Date.now() - sessionStartRef.current) / 1000),
          engine: data.engine,
        });
      } else if (reply.handoffTicket) {
        saveHandoffTicket(reply.handoffTicket);
        trackEvent({
          type: "handoff_requested",
          storeId: currentStore,
          label: `Handoff ${reply.handoffTicket.id}: ${reply.handoffTicket.customerPain}`,
          aisle: reply.handoffTicket.aisle,
          painTopic: data.painTopic || reply.handoffTicket.category,
          engine: data.engine,
        });
      } else {
        trackEvent({
          type: "chat_message",
          storeId: currentStore,
          label: `Consulta: "${trimmed.slice(0, 60)}"`,
          painTopic: data.painTopic,
          engine: data.engine,
          unmet: data.unmet,
        });
      }

      const aiMessage: ChatMessage = {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "assistant",
        ...reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      if (data.context) setContext(data.context);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: "Tive uma instabilidade momentânea ao processar. Pode tentar novamente?",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  async function handleVisionAnalyze(selection: VisionSelection) {
    if (loading) return;
    const currentStore = getSelectedStoreId();

    const userMsg: ChatMessage = {
      id: `uv-${Date.now()}`,
      role: "user",
      text:
        selection.kind === "sample"
          ? `Foto enviada: ${selection.label}`
          : selection.caption
          ? `Foto enviada (${selection.fileName}): ${selection.caption}`
          : `Foto enviada para diagnóstico (${selection.fileName})`,
      userImagePreview: selection.preview,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const payload =
        selection.kind === "sample"
          ? { sampleId: selection.sampleId, storeId: currentStore }
          : {
              fileName: selection.fileName,
              caption: selection.caption,
              imagePreview: selection.preview,
              storeId: currentStore,
            };

      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const analysis = data.analysis as VisionAnalysisResult;
      const identified = analysis.confidence > 0;

      if (analysis.project) {
        saveDynamicProject(analysis.project);
      }

      trackEvent({
        type: "vision_scan",
        storeId: currentStore,
        label: `Foto analisada: ${analysis.detectedItem} (confiança ${confidenceLabel(analysis.confidence)})`,
        aisle: analysis.project?.items?.[0]?.aisle,
        painTopic: analysis.category,
      });

      const aiMsg: ChatMessage = {
        id: `av-${Date.now()}`,
        role: "assistant",
        text: identified
          ? `Identifiquei **${analysis.detectedItem}** (confiança ${confidenceLabel(analysis.confidence)}).\n\n${analysis.diagnosis}`
          : analysis.diagnosis,
        visionResult: identified ? analysis : undefined,
        actionProject: analysis.project,
        suggestions: analysis.requiresSpecialist || !identified
          ? ["Chamar especialista"]
          : [analysis.suggestedPrompt, "Chamar especialista"],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `errv-${Date.now()}`,
          role: "assistant",
          text: "Não consegui concluir a análise visual agora. Tente novamente ou descreva por texto/voz.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function openProject(project: DynamicProjectList, target: "lista" | "mapa") {
    saveDynamicProject(project);
    router.push(`/${target}?id=${encodeURIComponent(project.id)}`);
  }

  const activeStore = getStoreById(storeId);

  return (
    <div className="flex h-dvh flex-col bg-floor">
      <StoreBar />

      {/* Sub-barra técnica de sessão em loja */}
      <div className="border-b border-rule bg-white px-4 py-2">
        <div className="mx-auto flex w-full max-w-[740px] items-center justify-between gap-2 text-[11.5px]">
          <div className="flex items-center gap-2 font-mono text-[11px] text-signage-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-leroy" />
            <span className="font-bold text-signage">{activeStore.shortName}</span>
            <span className="hidden text-rule-strong sm:inline">|</span>
            <span className="hidden sm:inline">VOZ · VISÃO · AUDITORIA ATIVA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setVisionOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-rule bg-floor px-3 py-2 text-[13px] font-semibold text-signage transition hover:border-leroy hover:bg-leroy-soft"
            >
              <CameraIcon size={14} />
              Foto
            </button>
            <button
              type="button"
              onClick={() => sendMessage("Chamar vendedor especialista")}
              disabled={loading}
              className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-md bg-signage px-3 py-2 text-[13px] font-semibold text-leroy transition hover:bg-signage-soft"
            >
              <UserCheckIcon size={14} />
              Chamar vendedor
            </button>
          </div>
        </div>
      </div>

      {/* Área de conversa */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-[740px] space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-2">
              <MessageBubble message={msg}>
                {/* Card de Visão Computacional */}
                {msg.visionResult && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-rule bg-floor p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-leroy-deep">
                        <SparkleIcon size={12} />
                        Leitura Visual · {msg.visionResult.category}
                      </span>
                      <span className="rounded bg-signage px-2 py-0.5 font-mono text-[10px] font-bold text-leroy">
                        CONFIANÇA {confidenceLabel(msg.visionResult.confidence).toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1.5 font-display text-[14px] font-bold text-signage">
                      {msg.visionResult.detectedItem}
                    </div>
                    <div className="mt-1.5 rounded border border-rule bg-white px-2.5 py-1.5 font-mono text-[11px] text-signage-muted">
                      {msg.visionResult.technicalTranslation}
                    </div>
                  </div>
                )}

                {/* Card de Projeto Calculado */}
                {msg.actionProject && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-rule-strong bg-floor">
                    <div className="flex items-center justify-between bg-signage px-3.5 py-2 text-white">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-leroy">
                        <ShieldCheckIcon size={13} />
                        Projeto Auditado · 3 Níveis + Instala
                      </div>
                      <span className="font-mono text-[13px] font-extrabold text-white tabular-nums">
                        {formatBRL(projectTotal(msg.actionProject))}
                      </span>
                    </div>

                    <div className="p-3.5">
                      <div className="font-display text-[16px] font-bold text-signage">
                        {msg.actionProject.title}
                      </div>

                      {/* Cada item com foto, corredor e preco para decidir sem abrir a lista */}
                      <ul className="mt-2.5 divide-y divide-rule rounded-md border border-rule bg-white">
                        {msg.actionProject.items.slice(0, 4).map((it) => (
                          <li key={it.productId} className="flex items-center gap-2.5 px-2.5 py-2">
                            <ProductThumb
                              src={it.imageUrl}
                              alt=""
                              category={it.category}
                              size={40}
                              className="p-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12.5px] font-semibold text-signage">{it.name}</div>
                              <div className="text-[11px] text-signage-muted">
                                <span className="font-mono font-bold text-signage">{it.corridorCode}</span>
                                {" · "}
                                {it.inStock ? `${it.stockQty} un.` : <span className="font-semibold text-danger">Sem estoque</span>}
                                {it.optional && " · Opcional"}
                              </div>
                            </div>
                            <span className="flex-shrink-0 font-mono text-[12.5px] font-bold tabular-nums text-signage">
                              {formatBRL(it.price * it.quantity)}
                            </span>
                          </li>
                        ))}
                        {msg.actionProject.items.length > 4 && (
                          <li className="px-2.5 py-1.5 text-[11.5px] font-medium text-signage-muted">
                            + {msg.actionProject.items.length - 4} itens na lista completa
                          </li>
                        )}
                      </ul>

                      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                        <span className="badge-stock-ok">
                          <CheckCircleIcon size={12} />
                          {msg.actionProject.items.filter((i) => i.inStock).length}/
                          {msg.actionProject.items.length} em estoque
                        </span>

                        {Array.from(
                          new Set(msg.actionProject.items.map((i) => i.corridorCode))
                        ).map((aisle) => (
                          <span key={aisle} className="aisle-plate">
                            {aisle}
                          </span>
                        ))}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openProject(msg.actionProject!, "lista")}
                          className="btn-primary !px-3 !py-2.5 !text-[12.5px]"
                        >
                          Lista & Auditoria
                          <ArrowRightIcon size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openProject(msg.actionProject!, "mapa")}
                          className="btn-accent !px-3 !py-2.5 !text-[12.5px]"
                        >
                          <MapIcon size={13} />
                          Rota na loja
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card de Despacho de Handoff Humano */}
                {msg.handoffTicket && (
                  <div className="mt-3 overflow-hidden rounded-lg border-2 border-signage bg-white">
                    <div className="flex items-center justify-between bg-signage px-3.5 py-2 text-white">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wider text-leroy">
                        <UserCheckIcon size={13} />
                        Despacho de Especialista
                      </span>
                      <span className="rounded bg-leroy px-2 py-0.5 font-mono text-[10.5px] font-extrabold text-signage">
                        {msg.handoffTicket.id}
                      </span>
                    </div>

                    <div className="p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-display text-[15px] font-bold text-signage">
                            {msg.handoffTicket.specialistName}
                          </div>
                          <div className="text-[12px] text-signage-muted">
                            {msg.handoffTicket.specialistRole}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="aisle-plate">
                            CORR. {corridorOf(msg.handoffTicket.aisle)}
                          </span>
                          <div className="mt-0.5 font-mono text-[10.5px] font-semibold text-signage-muted">
                            ETA ~{msg.handoffTicket.etaMinutes} min
                          </div>
                        </div>
                      </div>

                      <div className="mt-2.5 rounded border border-rule bg-floor p-2.5 text-[11.5px] text-signage-muted">
                        <span className="font-semibold text-signage">
                          Resumo enviado ao console:
                        </span>{" "}
                        {msg.handoffTicket.summary}
                      </div>

                      <Link
                        href="/painel"
                        className="mt-2.5 inline-flex items-center gap-1.5 font-mono text-[11.5px] font-bold uppercase text-leroy-deep hover:underline"
                      >
                        Acompanhar no Console do Vendedor
                        <ArrowRightIcon size={12} />
                      </Link>
                    </div>
                  </div>
                )}
              </MessageBubble>

              {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-[38px]">
                  {msg.suggestions.map((sug) => {
                    // Pedido de pessoa vira acao principal: chega em risco ou quando a resposta nao bastou.
                    const human = /chamar|especialista|t[ée]cnico|vendedor/i.test(sug);
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleSuggestion(sug)}
                        disabled={loading}
                        className={human ? "btn-primary min-h-[44px] !px-3.5 !py-2 !text-[13px]" : "chip"}
                      >
                        {human && <UserCheckIcon size={14} />}
                        {sug}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2.5">
              <AssistantAvatar size={28} />
              <div className="rounded-xl rounded-tl-sm border border-rule bg-white px-4">
                <TypingDots />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra de entrada multimodal: Voz + Câmera + Texto */}
      <div className="border-t border-rule bg-white px-4 py-3">
        <div className="mx-auto w-full max-w-[740px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2"
          >
            <VoiceButton
              compact
              disabled={loading}
              onTranscript={(transcript) => sendMessage(transcript, true)}
            />

            <button
              type="button"
              aria-label="Identificar peça por foto"
              title="Enviar foto da peça"
              onClick={() => setVisionOpen(true)}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border border-rule-strong bg-white text-signage transition hover:border-leroy hover:bg-leroy-soft hover:text-leroy-deep"
            >
              <CameraIcon size={18} />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              aria-label="Mensagem para o copiloto"
              placeholder="Descreva o problema…"
              disabled={loading}
              className="h-11 min-w-0 flex-1 rounded-lg border border-rule-strong bg-floor px-3.5 text-[13.5px] text-signage outline-none transition placeholder:text-signage-subtle focus:border-signage focus:bg-white"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Enviar mensagem"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-signage text-leroy transition hover:bg-signage-soft disabled:opacity-50"
            >
              <SendIcon size={16} />
            </button>
          </form>
        </div>
      </div>

      <VisionModal
        open={visionOpen}
        onClose={() => setVisionOpen(false)}
        onAnalyze={handleVisionAnalyze}
      />
    </div>
  );
}

// O modelo nao devolve probabilidade calibrada: mostrar faixa, nunca um percentual.
function confidenceLabel(confidence: number): string {
  if (confidence >= 80) return "alta";
  if (confidence >= 60) return "média";
  return "baixa";
}
