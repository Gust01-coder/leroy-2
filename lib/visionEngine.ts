import { getPresetProject } from "./projects";
import { normalizeText, semanticSearchCatalog } from "./semanticSearch";
import { DEFAULT_STORE_ID } from "./stores";
import { VisionAnalysisResult, VisionSampleId } from "./types";

export type VisionSampleMeta = {
  id: VisionSampleId;
  title: string;
  subtitle: string;
  tag: string;
  svgPreview: string; // Foto realista salva em /public/vision/
};

export const VISION_SAMPLES: VisionSampleMeta[] = [
  {
    id: "torneira-vazando",
    title: "Torneira pingando",
    subtitle: "Gotejamento contínuo na bica",
    tag: "Hidráulica · C05",
    svgPreview: "/vision/torneira-vazando.jpg",
  },
  {
    id: "sifao-pia",
    title: "Sifão sob a pia",
    subtitle: "Vazamento no tubo sanfonado",
    tag: "Hidráulica · C04",
    svgPreview: "/vision/sifao-pia.jpg",
  },
  {
    id: "trinca-parede",
    title: "Trinca com umidade",
    subtitle: "Fissura e bolhas na pintura",
    tag: "Obra / Parede · C24",
    svgPreview: "/vision/trinca-parede.jpg",
  },
  {
    id: "resistencia-chuveiro",
    title: "Resistência queimada",
    subtitle: "Filamento rompido no chuveiro",
    tag: "Elétrica · C19",
    svgPreview: "/vision/resistencia-chuveiro.jpg",
  },
];

// Palpite feito so pela legenda, sem olhar a imagem: nunca apresentar como certeza alta.
const TEXT_ONLY_CONFIDENCE = 60;

function notIdentified(): VisionAnalysisResult {
  return {
    id: `vis-${crypto.randomUUID().slice(0, 8)}`,
    detectedItem: "Não consegui identificar pela foto",
    confidence: 0,
    category: "Materiais Básicos",
    technicalTranslation: "Sem item do catálogo para esta foto",
    diagnosis: "Ainda não reconheço a peça só pela imagem. Descreva o problema por texto (ex.: \"torneira pingando\") ou escreva uma legenda na foto.",
    recommendedAction: "Descreva o problema por texto ou voz.",
    suggestedPrompt: "Chamar especialista",
    matchedProductIds: [],
  };
}

export function analyzeVisionInput(params: Parameters<typeof analyzeResolved>[0]): VisionAnalysisResult {
  const result = analyzeResolved(params);
  return params.sampleId ? result : { ...result, confidence: Math.min(result.confidence, TEXT_ONLY_CONFIDENCE) };
}

function analyzeResolved(params: {
  sampleId?: VisionSampleId;
  fileName?: string;
  caption?: string;
  imagePreview?: string;
  storeId?: string;
}): VisionAnalysisResult {
  const storeId = params.storeId || DEFAULT_STORE_ID;
  let resolvedSample = params.sampleId;

  if (!resolvedSample) {
    const hint = normalizeText(`${params.fileName ?? ""} ${params.caption ?? ""}`);
    if (/sifao|cano|embaixo|esgoto/.test(hint)) {
      resolvedSample = "sifao-pia";
    } else if (/trinca|rachad|mofo|parede|umidade|bolha/.test(hint)) {
      resolvedSample = "trinca-parede";
    } else if (/chuveiro|resist|eletr|fio|tomada|lampada/.test(hint)) {
      resolvedSample = "resistencia-chuveiro";
    } else if (/torneira|pia|ping|agua|hidraul/.test(hint)) {
      resolvedSample = "torneira-vazando";
    } else if (hint.length >= 3) {
      const matches = semanticSearchCatalog(hint, storeId, { limit: 3 });
      if (matches.length > 0) {
        const top = matches[0].product;
        return {
          id: `vis-${Date.now().toString(36)}`,
          detectedItem: `${top.name}`,
          confidence: TEXT_ONLY_CONFIDENCE,
          category: top.category,
          technicalTranslation: `Identificado em ${top.category} (Corredor ${top.corridorCode} · ${top.shelfLocation}).`,
          diagnosis: `Com base na foto enviada e na descrição "${params.caption || params.fileName}", o item compatível na unidade é ${top.name}.`,
          recommendedAction: "Confira os equivalentes ou abra a lista com rota guiada.",
          suggestedPrompt: top.name,
          matchedProductIds: matches.map((m) => m.product.id),
        };
      }
      return notIdentified();
    } else {
      // Sem analise de imagem e sem pista no texto: melhor admitir do que chutar torneira.
      return notIdentified();
    }
  }

  const sampleMeta = VISION_SAMPLES.find((s) => s.id === resolvedSample)!;
  const preview = params.imagePreview || sampleMeta.svgPreview;

  switch (resolvedSample) {
    case "torneira-vazando": {
      const project = getPresetProject("reparo-torneira", storeId)!;
      return {
        id: `vis-${Date.now().toString(36)}`,
        sampleId: resolvedSample,
        detectedItem: 'Torneira de Mesa 1/2" com gotejamento na bica',
        confidence: 96,
        category: "Hidráulica",
        technicalTranslation: "Corredor C05 (H3): Reparo para Torneiras Deca + Fita Veda Rosca Equation",
        diagnosis:
          "Vazamento pela bica fechada indica desgaste na vedação interna. Não precisa trocar a torneira inteira se o corpo estiver firme.",
        recommendedAction: "Trocar o reparo interno da torneira (15 min de instalação).",
        suggestedPrompt: "Quero o reparo da torneira identificada na foto",
        project,
        matchedProductIds: ["hid-reparo-univ", "hid-veda-rosca", "fer-chave-fenda"],
        imagePreview: preview,
      };
    }

    case "sifao-pia": {
      const project = getPresetProject("troca-sifao", storeId)!;
      return {
        id: `vis-${Date.now().toString(36)}`,
        sampleId: resolvedSample,
        detectedItem: 'Sifão Sanfonado 1.1/2" vazando na curva inferior',
        confidence: 94,
        category: "Hidráulica",
        technicalTranslation: "Corredor C04 (H2): Sifão Universal Extensível Amanco",
        diagnosis:
          "Fissura nas dobras do tubo sanfonado sob a pia. A troca por um sifão universal extensível elimina o gotejamento e o mau cheiro.",
        recommendedAction: "Substituir o sifão sem ferramentas pesadas (~12 min).",
        suggestedPrompt: "Montar lista para trocar o sifão da foto",
        project,
        matchedProductIds: ["hid-sifao-univ", "hid-veda-rosca"],
        imagePreview: preview,
      };
    }

    case "trinca-parede": {
      const project = getPresetProject("reparo-trinca", storeId)!;
      return {
        id: `vis-${Date.now().toString(36)}`,
        sampleId: resolvedSample,
        detectedItem: "Fissura vertical em reboco com bolhas de umidade",
        confidence: 91,
        category: "Materiais Básicos",
        technicalTranslation: "Corredor C24 (M4): Fita Telada Axton + Massa Acrílica 6kg Axton",
        diagnosis:
          "Fissura acompanhada de umidade na pintura. Passar massa comum sem fita telada faz a trinca reabrir em poucos meses.",
        recommendedAction: "Aplicar Fita Telada + Massa Acrílica Axton — ou chamar especialista em M4.",
        suggestedPrompt: "Chamar vendedor especialista para avaliar trinca",
        project,
        matchedProductIds: ["mat-massa-acrilica", "mat-fita-telada", "mat-espatula-aco", "lim-removedor-mofo"],
        imagePreview: preview,
        requiresSpecialist: true,
      };
    }

    case "resistencia-chuveiro": {
      const project = getPresetProject("troca-resistencia", storeId)!;
      return {
        id: `vis-${Date.now().toString(36)}`,
        sampleId: resolvedSample,
        detectedItem: "Resistência de Chuveiro Elétrico Rompida (220V)",
        confidence: 95,
        category: "Elétrica",
        technicalTranslation: "Corredor C19 (E1): Resistência Lorenzetti + Conector de Emenda Wago",
        diagnosis:
          "Filamento rompido interrompe o aquecimento. Na troca, recomenda-se substituir emendas com fita por conector de emenda Wago.",
        recommendedAction: "Desligar disjuntor, trocar resistência e encher de água fria antes de religar.",
        suggestedPrompt: "Ver lista segura para trocar resistência do chuveiro",
        project,
        matchedProductIds: ["ele-resistencia-univ", "ele-conector-wago", "ele-chave-teste"],
        imagePreview: preview,
      };
    }
  }
}
