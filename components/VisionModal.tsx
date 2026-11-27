"use client";

import { useRef, useState } from "react";
import { CameraIcon, CloseIcon, SparkleIcon, UploadIcon } from "./Icons";
import { VISION_SAMPLES } from "@/lib/ai/visionEngine";
import { VisionSampleId } from "@/lib/types";
import { useDialog } from "./useDialog";

export type VisionSelection =
  | { kind: "sample"; sampleId: VisionSampleId; label: string; preview: string }
  | { kind: "upload"; fileName: string; caption: string; preview: string };

export function VisionModal({
  open,
  onClose,
  onAnalyze,
}: {
  open: boolean;
  onClose: () => void;
  onAnalyze: (selection: VisionSelection) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string>("");
  const [fileError, setFileError] = useState("");
  const dialogRef = useDialog<HTMLDivElement>(open, onClose);

  if (!open) return null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Libera o input para que escolher o mesmo arquivo de novo dispare onChange.
    e.target.value = "";
    if (!file) return;
    setUploadedName(file.name);
    setFileError("");
    try {
      setUploadedPreview(await resizeToJpeg(file));
    } catch {
      setUploadedPreview(null);
      setUploadedName("");
      setFileError("Não consegui abrir essa imagem. Tente uma foto JPG ou PNG.");
    }
  }

  function submitUpload() {
    if (!uploadedPreview) return;
    onAnalyze({
      kind: "upload",
      fileName: uploadedName || "foto-loja.jpg",
      caption: caption.trim(),
      preview: uploadedPreview,
    });
    setUploadedPreview(null);
    setUploadedName("");
    setCaption("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-signage/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog" aria-modal="true" tabIndex={-1}
        aria-label="Enviar foto da peça"
        className="max-h-[90vh] w-full max-w-[490px] focus:outline-none animate-slide-up overflow-y-auto rounded-t-2xl border border-rule-strong bg-white shadow-2xl sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-signage px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <CameraIcon size={15} className="text-leroy" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
              Foto da peça ou da etiqueta
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="text-white/60 hover:text-white"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-[13px] leading-relaxed text-signage-muted">
            Aponte para a peça quebrada, etiqueta de prateleira ou parede com infiltração. A IA traduz para o SKU exato e gera a lista com rota.
          </p>

          <div className="mt-3.5 rounded-lg border-2 border-dashed border-rule-strong bg-floor p-3.5">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {!uploadedPreview ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center gap-3 py-1 text-left"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-signage text-leroy">
                  <CameraIcon size={20} />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-bold text-signage">
                    Abrir câmera ou enviar foto
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-signage-subtle">
                    <UploadIcon size={12} />
                    JPG, PNG ou câmera traseira do celular
                  </div>
                </div>
              </button>
            ) : (
              <div className="space-y-2.5">
                <div className="overflow-hidden rounded-lg border border-rule">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedPreview}
                    alt="Prévia da foto"
                    className="max-h-40 w-full object-cover"
                  />
                </div>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={200}
                  aria-label="Legenda da foto (opcional)"
                  placeholder="Contexto opcional (ex: torneira do banheiro pingando)…"
                  className="h-10 w-full rounded-lg border border-rule-strong bg-white px-3 text-[13px] outline-none focus:border-signage"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadedPreview(null)}
                    className="btn-secondary flex-1 !py-2 !text-[12.5px]"
                  >
                    Trocar foto
                  </button>
                  <button
                    type="button"
                    onClick={submitUpload}
                    className="btn-accent flex-1 !py-2 !text-[12.5px]"
                  >
                    <SparkleIcon size={14} />
                    Diagnosticar
                  </button>
                </div>
              </div>
            )}
            {fileError && (
              <p role="alert" className="mt-2 text-[11.5px] font-semibold text-danger">
                {fileError}
              </p>
            )}
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="kicker">Testar com foto de exemplo</span>
              <span className="font-mono text-[10px] font-semibold text-leroy-deep">
                1 CLIQUE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {VISION_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    onAnalyze({
                      kind: "sample",
                      sampleId: sample.id,
                      label: sample.title,
                      preview: sample.svgPreview,
                    });
                    onClose();
                  }}
                  className="group overflow-hidden rounded-lg border border-rule bg-white text-left transition hover:border-leroy hover:shadow-sm"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-floor">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sample.svgPreview}
                      alt={sample.title}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-2">
                    <div className="font-mono text-[9.5px] font-bold uppercase tracking-wider text-leroy-deep">
                      {sample.tag}
                    </div>
                    <div className="mt-0.5 text-[12px] font-bold leading-tight text-signage">
                      {sample.title}
                    </div>
                    <div className="mt-0.5 truncate text-[10.5px] text-signage-muted">
                      {sample.subtitle}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const MAX_SIDE = 1024;

// Foto de celular tem 3-8 MB; reduzida fica ~200 KB, sobe rapido no 4G e cabe no limite da API.
async function resizeToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}
