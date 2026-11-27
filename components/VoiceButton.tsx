"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, MicIcon } from "./Icons";
import { trackEvent } from "@/lib/telemetry";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const VOICE_DEMO_PHRASES = [
  "Minha torneira do banheiro está pingando",
  "Quero pintar um quarto azul de 4 por 5 com teto",
  "Meu chuveiro parou de esquentar",
  "Quero instalar uma prateleira na parede de drywall",
];

/**
 * Botão de Voz Mãos-Livres (Web Speech API pt-BR) pensado para clientes
 * empurrando carrinho na loja física — com fallback interativo caso o dispositivo
 * esteja sem permissão de microfone durante demonstrações/banca.
 */
export function VoiceButton({
  onTranscript,
  compact = false,
  disabled = false,
}: {
  onTranscript: (text: string) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [micNote, setMicNote] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  function startListening() {
    setOpen(true);
    setLiveText("");
    setMicNote(null);

    if (typeof window === "undefined") return;
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setListening(false);
      setMicNote(
        "Reconhecimento nativo indisponível neste navegador — toque em uma fala simulada abaixo para testar."
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = "pt-BR";
      rec.interimResults = true;
      rec.continuous = false;

      rec.onresult = (event) => {
        let combined = "";
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript;
        }
        setLiveText(combined);
        const last = event.results[event.results.length - 1];
        if (last?.isFinal && combined.trim()) {
          finishWithText(combined.trim());
        }
      };

      rec.onerror = () => {
        setListening(false);
        setMicNote(
          "Microfone sem acesso neste ambiente — você pode testar com uma fala pronta abaixo."
        );
      };

      rec.onend = () => {
        setListening(false);
      };

      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      setMicNote("Use uma das frases de voz de demonstração abaixo.");
    }
  }

  function finishWithText(text: string) {
    recRef.current?.stop();
    setListening(false);
    setOpen(false);
    trackEvent({
      type: "voice_command",
      label: `Comando de voz: "${text.slice(0, 64)}"`,
    });
    onTranscript(text);
  }

  function closeModal() {
    recRef.current?.stop();
    setListening(false);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={startListening}
        aria-label="Falar comando de voz mãos-livres"
        title="Falar no microfone (mãos livres no corredor)"
        className={
          compact
            ? "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-rule-strong bg-white text-signage transition hover:border-leroy hover:bg-leroy-soft hover:text-leroy-deep disabled:opacity-40"
            : "inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-leroy/60 bg-leroy-soft px-4 py-2.5 text-[13.5px] font-bold text-leroy-deep transition hover:bg-leroy-cta hover:text-white disabled:opacity-40"
        }
      >
        <MicIcon size={17} />
        {!compact && <span>Falar</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-signage/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-[440px] animate-slide-up overflow-hidden rounded-t-2xl border border-rule-strong bg-white shadow-2xl sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-signage px-5 py-3.5 text-white">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    listening ? "animate-ping bg-leroy" : "bg-leroy"
                  }`}
                />
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                  Modo Voz Mãos-Livres · PT-BR
                </span>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Fechar"
                className="text-white/60 hover:text-white"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="p-5">
              {/* Visualizador de onda */}
              <div className="flex flex-col items-center rounded-lg border border-rule bg-floor px-4 py-5 text-center">
                <div className="flex h-10 items-center gap-1.5">
                  {[0, 120, 240, 80, 300, 160, 40].map((delay, i) => (
                    <span
                      key={i}
                      className={`w-1.5 rounded-full bg-leroy ${
                        listening ? "h-8 animate-wave-bar" : "h-3 opacity-45"
                      }`}
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>

                <div className="mt-3 font-display text-[17px] font-bold text-signage">
                  {listening ? "Ouvindo você no corredor…" : "Pronto para ouvir"}
                </div>

                {liveText ? (
                  <p className="mt-1.5 rounded-md bg-white px-3 py-1.5 text-[13.5px] font-medium text-signage">
                    &ldquo;{liveText}&rdquo;
                  </p>
                ) : (
                  <p className="mt-1 text-[12px] text-signage-muted">
                    {micNote ??
                      'Fale naturalmente enquanto empurra o carrinho. Ex: "Minha torneira tá pingando".'}
                  </p>
                )}

                {liveText && (
                  <button
                    type="button"
                    onClick={() => finishWithText(liveText)}
                    className="btn-accent mt-3 !py-2 !text-[12.5px]"
                  >
                    Enviar transcrição
                  </button>
                )}
              </div>

              {/* Simulador de voz para ambiente sem microfone */}
              <div className="mt-4">
                <div className="kicker mb-2">
                  Testar comando de voz em 1 clique
                </div>
                <div className="space-y-1.5">
                  {VOICE_DEMO_PHRASES.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => finishWithText(phrase)}
                      className="flex w-full items-center gap-2.5 rounded-lg border border-rule bg-white px-3 py-2 text-left text-[12.5px] font-medium text-signage transition hover:border-leroy hover:bg-leroy-soft/40"
                    >
                      <MicIcon size={13} className="flex-shrink-0 text-leroy-dark" />
                      <span>&ldquo;{phrase}&rdquo;</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
