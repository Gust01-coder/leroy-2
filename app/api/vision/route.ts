import { NextResponse } from "next/server";
import { VISION_MODEL, isLlmEnabled } from "@/lib/ai/llm";
import { isRateLimited } from "@/lib/server/rateLimit";
import { analyzeVisionInput } from "@/lib/ai/visionEngine";
import { analyzeWithLlm, parseImageDataUrl } from "@/lib/ai/visionLlm";
import { DEFAULT_STORE_ID } from "@/lib/store/stores";
import { VisionSampleId } from "@/lib/types";

// Foto ja chega reduzida pelo cliente (~200 KB); o teto protege o limite de 4,5 MB da Vercel.
const MAX_IMAGE_CHARS = 3_000_000;

type VisionRequestBody = {
  sampleId?: VisionSampleId;
  fileName?: string;
  caption?: string;
  imagePreview?: string;
  storeId?: string;
};

export async function POST(req: Request) {
  if (isRateLimited(req)) {
    return NextResponse.json({ error: "Muitas fotos seguidas. Aguarde um minuto." }, { status: 429 });
  }

  let body: VisionRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const storeId = body.storeId || DEFAULT_STORE_ID;
  const caption = (body.caption ?? "").slice(0, 200);
  const image = body.imagePreview;

  if (image && (image.length > MAX_IMAGE_CHARS || !parseImageDataUrl(image))) {
    return NextResponse.json({ error: "Imagem inválida ou grande demais" }, { status: 400 });
  }

  if (image && !body.sampleId && isLlmEnabled()) {
    try {
      const analysis = await analyzeWithLlm({ imageDataUrl: image, caption, storeId });
      return NextResponse.json({ analysis, engine: VISION_MODEL });
    } catch (err) {
      console.warn("[vision] fallback para motor local:", err instanceof Error ? err.message : err);
    }
  }

  // A imagem nao volta na resposta: o cliente ja tem a previa.
  const analysis = analyzeVisionInput({
    sampleId: body.sampleId,
    fileName: body.fileName,
    caption,
    storeId,
  });
  return NextResponse.json({ analysis, engine: "local" });
}
