import { buildPaintingProject, getPresetProject, materializeProjectItems } from "./projects";
import { normalizeText, semanticSearchCatalog } from "./semanticSearch";
import { DEFAULT_STORE_ID, getSpecialistForDepartment } from "./stores";
import {
  ChatContext,
  ChatMessage,
  Department,
  DynamicProjectList,
  HandoffTicket,
} from "./types";
import { corridorOf } from "./storeMap";

export const INITIAL_CONTEXT: ChatContext = {
  step: "start",
  intent: null,
  storeId: DEFAULT_STORE_ID,
  details: {},
  history: [],
};

export function createHandoffTicket(
  storeId: string,
  department: Department,
  pain: string,
  history: string[],
  complexity: "Alta" | "Média" = "Alta"
): HandoffTicket {
  const specialist = getSpecialistForDepartment(storeId, department);
  // 4 digitos aleatorios colidiam com poucas dezenas de chamados no painel
  const shortId = `LM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const highlights = history.slice(-4);
  return {
    id: shortId,
    storeId,
    customerPain: pain,
    category: department,
    complexity,
    specialistName: specialist.name,
    specialistRole: specialist.role,
    aisle: specialist.aisle,
    etaMinutes: specialist.etaMinutes,
    status: "a_caminho",
    summary: `Cliente solicitou apoio especializado em ${department}: "${pain}". Contexto completo enviado ao tablet do vendedor.`,
    highlights: highlights.length > 0 ? highlights : [pain],
    createdAt: Date.now(),
  };
}

function parseRoomDimensions(input: string): { width: number; length: number } | null {
  const norm = normalizeText(input);
  // Padrão "3x4", "3,5 x 4,2", "3 por 4"
  const dimMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*(?:x|por|\*)\s*(\d+(?:[.,]\d+)?)/);
  if (dimMatch) {
    const w = parseFloat(dimMatch[1].replace(",", "."));
    const l = parseFloat(dimMatch[2].replace(",", "."));
    if (w >= 1 && w <= 30 && l >= 1 && l <= 30) {
      return { width: w, length: l };
    }
  }
  // Padrão "15m2", "20 m²"
  const areaMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*m/);
  if (areaMatch) {
    const area = parseFloat(areaMatch[1].replace(",", "."));
    if (area >= 4 && area <= 200) {
      const side = Math.round(Math.sqrt(area) * 10) / 10;
      return { width: side, length: side };
    }
  }
  return null;
}

function detectColor(input: string): "azul" | "branco" | null {
  const n = normalizeText(input);
  if (/azul|royal|marinho|sereno|turquesa/.test(n)) return "azul";
  if (/branc|gelo|neve|clar|off|bege|cinza/.test(n)) return "branco";
  return null;
}

function detectFinish(input: string): "fosco" | "acetinado" {
  const n = normalizeText(input);
  if (/acetinad|lavavel|brilh|semi/.test(n)) return "acetinado";
  return "fosco";
}

export function formatTotal(project: DynamicProjectList): string {
  const sum = project.items
    .filter((i) => !i.optional)
    .reduce((acc, i) => acc + i.price * i.quantity, 0);
  return sum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildProductListProject(
  storeId: string,
  query: string,
  specs: Array<{ productId: string; reason?: string }>,
  sourceIntent: string
): DynamicProjectList {
  const items = materializeProjectItems(
    specs.map((spec) => ({ ...spec, quantity: 1 })),
    storeId
  );
  return {
    id: `custom-${crypto.randomUUID().slice(0, 8)}`,
    title: `Seleção para "${query.slice(0, 36)}${query.length > 36 ? "…" : ""}"`,
    subtitle: `${items.length} produtos encontrados no catálogo da loja`,
    description: `Itens do catálogo que combinam com o que você descreveu, com corredor, prateleira e estoque da loja.`,
    storeId,
    difficulty: "Fácil",
    estimatedInstallMin: 20,
    sourceIntent,
    items,
    tutorial: [
        {
          step: 1,
          title: "Confira as medidas e especificações na prateleira",
          detail: "Use a localização exata de corredor e módulo na lista para comparar bitolas, voltagem ou rendimento na embalagem.",
          durationMin: 3,
        },
        {
          step: 2,
          title: "Se precisar de apoio técnico, chame um especialista",
          detail: "Em qualquer momento do chat você pode clicar em 'Chamar especialista' e levar seu resumo direto ao atendente do setor.",
          durationMin: 2,
        },
      ],
    createdAt: Date.now(),
  };
}

export type CopilotReplyPayload = {
  response: Omit<ChatMessage, "id" | "role" | "timestamp">;
  newContext: ChatContext;
  painTopic?: string;
  /** Pedido que o catalogo nao atendeu, para o painel da loja. */
  unmet?: string;
};

/**
 * Motor conversacional de diagnóstico do LM Copiloto v2.
 * Suporta múltiplos domínios, cálculo dinâmico de medidas, busca semântica aberta
 * e abertura real de ticket de Handoff Humano com resumo da conversa.
 */
const QUICK_PRESETS: Array<[RegExp, string]> = [
  [/rejunt/, "refazer-rejunte"],
  [/(portao|grade|gradil).*(ferro|pint|ferrug)|(pint|ferrug).*(portao|grade|gradil)/, "pintar-portao"],
  [/descarga|nao para de encher|caixa acoplada.*(vaza|enche|escorr)|(vaza|escorr).*caixa acoplada/, "reparo-caixa-acoplada"],
  [/entup/, "desentupir-pia"],
];

/**
 * Pedido por um item especifico ("suporte de mao francesa", "fita pro rodape"): devolve a lista
 * direto. Sem isso, as intencoes genericas (pintura, prateleira) respondem com uma pergunta de
 * esclarecimento e o cliente que ja sabe o que quer perde um passo.
 */
type SpecificItem = {
  pattern: RegExp;
  topic: string;
  items: Array<{ productId: string; reason: string }>;
};

const SPECIFIC_ITEMS: SpecificItem[] = [
  {
    pattern: /\brolo\b.*\bbandeja\b|\bbandeja\b.*\brolo\b|\brolinho\b/,
    topic: "Rolo e bandeja de pintura",
    items: [
      { productId: "tin-rolo-bandeja", reason: "Kit com rolo e bandeja" },
      { productId: "tin-trincha", reason: "Para os cantos e recortes" },
    ],
  },
  {
    pattern: /\bfita\b.*(rodape|crepe|sujar|proteger)|\bcrepe\b/,
    topic: "Fita de proteção para pintura",
    items: [
      { productId: "tin-fita-crepe", reason: "Protege rodapé e batentes" },
      { productId: "tin-lona", reason: "Protege o piso" },
    ],
  },
  {
    pattern: /(plastico|lona).*(chao|piso|cobrir|proteger)|(chao|piso).*(plastico|lona)/,
    topic: "Proteção de piso para pintura",
    items: [
      { productId: "tin-lona", reason: "Cobre o piso e os móveis" },
      { productId: "tin-fita-crepe", reason: "Prende a lona na parede" },
    ],
  },
  {
    pattern: /\b(bucha|parafuso)s?\b.*(tijolo|alvenaria)|(tijolo|alvenaria).*\b(bucha|parafuso)s?\b/,
    topic: "Bucha para parede de tijolo",
    items: [
      { productId: "fix-bucha-s8", reason: "Bucha 8 mm para alvenaria" },
      { productId: "fer-kit-brocas", reason: "Broca na bitola certa" },
    ],
  },
  {
    pattern: /mao francesa/,
    topic: "Mão francesa",
    items: [
      { productId: "fix-mao-francesa", reason: "Suporte reforçado para prateleira" },
      { productId: "fix-bucha-s8", reason: "Fixação na parede" },
      { productId: "fer-nivel-bolha", reason: "Garante a prateleira reta" },
    ],
  },
  {
    pattern: /\bnivel\b/,
    topic: "Nível",
    items: [
      { productId: "fer-nivel-bolha", reason: "Deixa o quadro ou a prateleira reta" },
      { productId: "fix-bucha-s8", reason: "Para fixar depois de alinhar" },
    ],
  },
];

export const RISKS = ["nenhum", "eletrica", "gas", "estrutura", "altura"] as const;
export type Risk = (typeof RISKS)[number];

// Regras de dominio aplicadas no codigo, independentes do modelo.
const RISK_PATTERNS: Array<[Risk, RegExp]> = [
  ["gas", /\bgas\b|botijao|fogao|aquecedor a gas/],
  ["eletrica", /chuveiro|tomada|disjuntor|fiacao|\bfios?\b|choque|interruptor|resistencia|eletric|lampada|plafon/],
  ["estrutura", /viga|pilar|\blaje\b|estrutural|derrubar parede|rachadura grande|trinca grande/],
  ["altura", /telhado|forro|andaime|fachada|escada alta/],
];

export const SAFETY_NOTES: Record<Exclude<Risk, "nenhum">, string> = {
  gas: "**Gás não é serviço para fazer sozinho.** Se sentir cheiro, feche o registro, abra as janelas, não acione interruptores e chame a distribuidora ou um técnico credenciado.",
  eletrica: "**Segurança:** desligue o disjuntor do circuito e confirme com a chave de teste antes de mexer. Fio derretido, cheiro de queimado ou disjuntor desarmando de novo pedem um eletricista.",
  estrutura: "**Segurança:** trinca larga, em diagonal ou que volta pode ser estrutural. Antes de esconder com massa, vale a avaliação de um engenheiro.",
  altura: "**Segurança:** trabalho em altura pede escada firme e alguém junto. Acima de 2 m, prefira um profissional.",
};

export function detectRisk(message: string): Risk {
  const n = normalizeText(message);
  return RISK_PATTERNS.find(([, re]) => re.test(n))?.[0] ?? "nenhum";
}

export function processCopilotMessage(
  rawInput: string,
  context: ChatContext
): CopilotReplyPayload {
  const input = rawInput.trim();
  const n = normalizeText(input);
  const storeId = context.storeId || DEFAULT_STORE_ID;

  const newCtx: ChatContext = {
    ...context,
    storeId,
    details: { ...context.details },
    history: [...(context.history ?? []), input].slice(-8),
  };

  // Atalho global: chamar vendedor especialista a qualquer momento
  if (/\b(chama|chamar|falar com|preciso de|quero um)\b.*(vendedor|especialista|atendente|humano|tecnico|eletricista|encanador|pessoa|alguem)|^chamar vendedor$|^falar com especialista$/.test(n)) {
    const dept: Department =
      /eletric/.test(n)
        ? "Elétrica"
        : /hidraul|encanador/.test(n)
        ? "Hidráulica"
        : newCtx.intent === "torneira"
        ? "Hidráulica"
        : newCtx.intent === "pintura"
        ? "Tintas"
        : newCtx.intent === "eletrica" || newCtx.intent === "iluminacao"
        ? "Elétrica"
        : "Materiais Básicos";

    const ticket = createHandoffTicket(
      storeId,
      dept,
      newCtx.details.pain || newCtx.history[0] || "Consultoria em loja",
      newCtx.history
    );
    newCtx.step = "start";
    return {
      painTopic: "Handoff Especialista",
      response: {
        text: `Combinado! Acionei **${ticket.specialistName}** (${ticket.specialistRole}), que está próximo ao corredor **${corridorOf(ticket.aisle)}**.\n\nO resumo da nossa conversa já apareceu no painel dele (ticket **${ticket.id}**) — assim você não precisa repetir nada.`,
        handoffTicket: ticket,
        suggestions: ["Resolver outro projeto", "Ver catálogo da loja"],
      },
      newContext: newCtx,
    };
  }

  // Gas nunca vira lista de compras, em nenhuma etapa da conversa.
  if (detectRisk(input) === "gas") {
    newCtx.step = "start";
    return {
      painTopic: "Gás",
      response: { text: SAFETY_NOTES.gas, suggestions: ["Chamar especialista", "Resolver outro projeto"] },
      newContext: newCtx,
    };
  }

  // Reinício explícito
  if (/^(resolver outro( projeto)?|outro projeto|comecar de novo|novo projeto|voltar ao inicio)$/.test(n)) {
    newCtx.step = "start";
    newCtx.intent = null;
    newCtx.details = {};
    return {
      response: {
        text: "Perfeito! Qual é o próximo projeto ou problema que você quer resolver hoje? Pode descrever com suas palavras ou enviar uma foto.",
        suggestions: [
          "Minha torneira está pingando",
          "Quero pintar um quarto azul de 3x4m",
          "Quero instalar uma prateleira",
          "Chuveiro parou de esquentar",
        ],
      },
      newContext: newCtx,
    };
  }

  // ================= ETAPAS EM ANDAMENTO =================

  // 1. Fluxo TORNEIRA / VAZAMENTO
  if (context.step === "torneira:onde") {
    if (/cano|embaixo|sifao|pia embaixo|debaixo/.test(n)) {
      const project = getPresetProject("troca-sifao", storeId)!;
      newCtx.step = "start";
      return {
        painTopic: "Vazamento / Sifão",
        response: {
          text: `Vazamento embaixo da pia quase sempre é o **sifão sanfonado** ressecado ou folgado.\n\nMontei a lista exata (**${formatTotal(
            project
          )}**), confirmei estoque na sua loja e já incluí o passo a passo de troca (leva ~12 min).`,
          actionProject: project,
          suggestions: ["Enviar foto do encanamento", "Chamar especialista"],
        },
        newContext: newCtx,
      };
    }

    newCtx.details.local = "torneira";
    newCtx.step = "torneira:tipo";
    return {
      painTopic: "Torneira pingando",
      response: {
        text: "Perfeito. Essa torneira é de **uma alavanca só** (monocomando) ou **tradicional de rosca/volante**?",
        suggestions: [
          "Tradicional (rosca/volante)",
          "Monocomando (uma alavanca)",
          "Não tenho certeza — quero trocar completa",
        ],
      },
      newContext: newCtx,
    };
  }

  if (context.step === "torneira:tipo") {
    if (/trocar|completa|nova/.test(n)) {
      const project = getPresetProject("troca-torneira", storeId)!;
      newCtx.step = "start";
      return {
        painTopic: "Troca de torneira",
        response: {
          text: `Lista de **troca completa** montada (**${formatTotal(
            project
          )}**). Todos os itens com estoque confirmado e localização exata de corredor e prateleira.`,
          actionProject: project,
        },
        newContext: newCtx,
      };
    }

    const isMono = /mono|alavanca/.test(n);
    newCtx.details.tipo = isMono ? "monocomando" : "tradicional";
    newCtx.step = "torneira:escolha";

    const repairProj = getPresetProject(
      isMono ? "reparo-monocomando" : "reparo-torneira",
      storeId
    )!;
    const swapProj = getPresetProject("troca-torneira", storeId)!;

    return {
      painTopic: "Torneira pingando",
      response: {
        text: `Diagnóstico fechado! Você tem dois caminhos claros:\n\n**1. Reparo interno (${formatTotal(
          repairProj
        )})** — troca apenas ${
          isMono ? "o cartucho cerâmico 35mm" : "a vedação universal 1/2\""
        }. Resolve ~80% dos vazamentos em 15 min.\n\n**2. Troca completa (${formatTotal(
          swapProj
        )})** — torneira monocomando nova + engate flexível. Vale muito a pena se a atual estiver antiga ou oxidada.\n\nQual você prefere?`,
        suggestions: ["Quero o reparo econômico", "Quero trocar a torneira completa"],
      },
      newContext: newCtx,
    };
  }

  if (context.step === "torneira:escolha") {
    const isSwap = /trocar|completa|nova/.test(n);
    const projectId = isSwap
      ? "troca-torneira"
      : newCtx.details.tipo === "monocomando"
      ? "reparo-monocomando"
      : "reparo-torneira";
    const project = getPresetProject(projectId, storeId)!;
    newCtx.step = "start";
    return {
      painTopic: isSwap ? "Troca de torneira" : "Reparo de torneira",
      response: {
        text: `Prontinho! Lista de **${project.title}** gerada (**${formatTotal(
          project
        )}**), com estoque checado agora na sua loja, rota pelos corredores e tutorial de instalação passo a passo.`,
        actionProject: project,
      },
      newContext: newCtx,
    };
  }

  // 2. Fluxo PINTURA (Cálculo real dinâmico)
  if (context.step === "pintura:dimensoes") {
    const dims = parseRoomDimensions(input) ?? { width: 3, length: 4 };
    const includeCeiling = /teto/.test(n);
    const detectedColor = detectColor(input) ?? (newCtx.details.color as "azul" | "branco" | undefined);

    newCtx.details.width = String(dims.width);
    newCtx.details.length = String(dims.length);
    newCtx.details.ceiling = includeCeiling ? "true" : "false";

    if (detectedColor) {
      const finish = detectFinish(input);
      const project = buildPaintingProject({
        storeId,
        widthM: dims.width,
        lengthM: dims.length,
        includeCeiling,
        color: detectedColor,
        finish,
      });
      newCtx.step = "start";
      return {
        painTopic: "Pintura de cômodo",
        response: {
          text: `Calculei automaticamente para **${dims.width}×${dims.length}m**${
            includeCeiling ? " (parede + teto)" : " (somente paredes)"
          }:\n\n${project.calculationNote}\n\nMontei a lista completa (**${formatTotal(
            project
          )}**). Note se algum item opcional estiver sem estoque: a lista já sugere substituto disponível na loja!`,
          actionProject: project,
        },
        newContext: newCtx,
      };
    }

    newCtx.step = "pintura:cor";
    const approxArea = Math.round(
      2 * (dims.width + dims.length) * 2.8 - 2.6 + (includeCeiling ? dims.width * dims.length : 0)
    );
    const approxLiters = Math.ceil((approxArea * 2) / 9.5);
    return {
      painTopic: "Pintura de cômodo",
      response: {
        text: `Para **${dims.width}×${dims.length}m**${
          includeCeiling ? " + teto" : ""
        }, calculei cerca de **${approxArea}m²** → aproximadamente **${approxLiters}L de tinta** para 2 demãos.\n\nQual cor e acabamento você prefere?`,
        suggestions: [
          "Azul sereno fosco",
          "Branco neve acetinado lavável",
          "Branco fosco econômico",
        ],
      },
      newContext: newCtx,
    };
  }

  if (context.step === "pintura:cor") {
    const widthM = parseFloat(newCtx.details.width || "3");
    const lengthM = parseFloat(newCtx.details.length || "4");
    const includeCeiling = newCtx.details.ceiling === "true";
    const color = detectColor(input) ?? "azul";
    const finish = detectFinish(input);

    const project = buildPaintingProject({
      storeId,
      widthM,
      lengthM,
      includeCeiling,
      color,
      finish,
    });
    newCtx.step = "start";
    return {
      painTopic: "Pintura de cômodo",
      response: {
        text: `Lista de pintura sob medida pronta (**${formatTotal(project)}**)!\n\n${
          project.calculationNote
        } Já incluí rolo antigotas, trincha, fita crepe, lona e lixa com rota otimizada na loja.`,
        actionProject: project,
      },
      newContext: newCtx,
    };
  }

  // Oferecido depois do chamado de trinca grande.
  if (/lista preventiva/.test(n)) {
    const project = getPresetProject("reparo-trinca", storeId)!;
    newCtx.step = "start";
    return {
      painTopic: "Trinca / Infiltração",
      response: {
        text: `Esta é a lista do reparo superficial (**${formatTotal(project)}**). Use só depois da avaliação do especialista: se a trinca for estrutural, a massa esconde o problema.`,
        actionProject: project,
        suggestions: ["Resolver outro projeto"],
      },
      newContext: newCtx,
    };
  }

  // 3. Fluxo TRINCA / INFILTRAÇÃO / MOFO
  if (context.step === "trinca:tamanho") {
    if (/mais de 30|grande|profund|estrutur|abert|viga|pilar/.test(n)) {
      const ticket = createHandoffTicket(
        storeId,
        "Materiais Básicos",
        "Trinca extensa (>30cm) ou possível infiltração estrutural",
        newCtx.history,
        "Alta"
      );
      newCtx.step = "start";
      return {
        painTopic: "Trinca / Infiltração",
        response: {
          text: `Trincas maiores que 30cm ou profundas pedem avaliação técnica para não mascarar infiltração ou movimentação estrutural.\n\nAcionei **${ticket.specialistName}** (${ticket.specialistRole}, corredor **${corridorOf(ticket.aisle)}**) com o resumo da nossa conversa (ticket **${ticket.id}**).`,
          handoffTicket: ticket,
          suggestions: ["Ver lista preventiva mesmo assim", "Resolver outro projeto"],
        },
        newContext: newCtx,
      };
    }

    const project = getPresetProject("reparo-trinca", storeId)!;
    newCtx.step = "start";
    return {
      painTopic: "Trinca / Infiltração",
      response: {
        text: `Para trincas finas e superficiais, o segredo para **não voltar a abrir** é combinar **fita telada + massa acrílica antimofo**.\n\nMontei a lista completa (**${formatTotal(
          project
        )}**) com passo a passo e rota na loja.`,
        actionProject: project,
        suggestions: ["Prefiro falar com especialista"],
      },
      newContext: newCtx,
    };
  }

  // 4. Fluxo PRATELEIRA / FIXAÇÃO
  if (context.step === "prateleira:parede") {
    const isDrywall = /drywall|gesso|oca/.test(n);
    const project = getPresetProject(
      isDrywall ? "instalar-prateleira-drywall" : "instalar-prateleira",
      storeId
    )!;
    newCtx.step = "start";
    return {
      painTopic: "Instalar prateleira",
      response: {
        text: `Excelente! Para parede de **${
          isDrywall ? "drywall / gesso" : "alvenaria (tijolo/concreto)"
        }**, selecionei a bucha exata que não solta + suportes reforçados + nível de bolha (**${formatTotal(
          project
        )}**).`,
        actionProject: project,
      },
      newContext: newCtx,
    };
  }

  // 5. Fluxo CHUVEIRO / ELÉTRICA
  if (context.step === "eletrica:tipo") {
    if (/fia|quadro|disjuntor|queimando direto|cheiro de queimado|especialista/.test(n)) {
      const ticket = createHandoffTicket(
        storeId,
        "Elétrica",
        "Diagnóstico elétrico — disjuntor desarmando / fiação aquecendo",
        newCtx.history,
        "Alta"
      );
      newCtx.step = "start";
      return {
        painTopic: "Elétrica / Chuveiro",
        response: {
          text: `Segurança em primeiro lugar! Quando há aquecimento de fio ou queda recorrente do disjuntor, nosso técnico precisa dimensionar cabo e amperagem.\n\nChamei **${ticket.specialistName}** (${ticket.specialistRole}, corredor **${corridorOf(ticket.aisle)}**) — ticket **${ticket.id}**.`,
          handoffTicket: ticket,
        },
        newContext: newCtx,
      };
    }

    const project = getPresetProject("troca-resistencia", storeId)!;
    newCtx.step = "start";
    return {
      painTopic: "Chuveiro / Resistência",
      response: {
        text: `Beleza! Se o chuveiro liga mas sai água fria, em 90% das vezes é só a **resistência rompida**.\n\nMontei o kit seguro (**${formatTotal(
          project
        )}**) já com **conector de emenda Wago** (evita emenda derretida) e **tutorial com alerta do disjuntor**.`,
        actionProject: project,
      },
      newContext: newCtx,
    };
  }

  // ================= DETECÇÃO DE INTENÇÃO INICIAL =================

  // Projetos prontos com gatilho direto (antes das intencoes genericas que os capturariam).
  const quick = QUICK_PRESETS.find(([re]) => re.test(n));
  if (quick) {
    const project = getPresetProject(quick[1], storeId)!;
    return {
      painTopic: project.title,
      response: {
        text: `Montei o projeto **${project.title}** (**${formatTotal(project)}**) com os itens certos e o passo a passo.`,
        actionProject: project,
      },
      newContext: newCtx,
    };
  }

  const specific = SPECIFIC_ITEMS.find(({ pattern }) => pattern.test(n));
  if (specific) {
    const project = buildProductListProject(storeId, input, specific.items, "busca-semantica");
    return {
      painTopic: specific.topic,
      response: {
        text: `Separei **${specific.topic.toLowerCase()}** com o corredor e o estoque da sua loja (**${formatTotal(project)}**).`,
        actionProject: project,
        suggestions: ["Chamar vendedor especialista", "Resolver outro projeto"],
      },
      newContext: newCtx,
    };
  }

  if (/tomada/.test(n) && !/chuveiro|esquent|queim|faisc|choque|derret/.test(n)) {
    const project = buildProductListProject(
      storeId,
      input,
      [
        { productId: "ele-tomada", reason: "Tomada nova no padrão brasileiro" },
        { productId: "ele-chave-teste", reason: "Confirma que a energia está desligada" },
        { productId: "ele-fita-isolante", reason: "Isola as pontas dos fios" },
        { productId: "fer-chave-fenda", reason: "Solta e fixa os parafusos da tomada" },
      ],
      "eletrica"
    );
    return {
      painTopic: "Tomada",
      response: {
        text: `Separei a **tomada nova** e os itens para trocar com segurança (**${formatTotal(project)}**).\n\n${SAFETY_NOTES.eletrica}`,
        actionProject: project,
        suggestions: ["Chamar técnico de elétrica", "Resolver outro projeto"],
      },
      newContext: newCtx,
    };
  }

  // A. Torneira / Vazamento / Sifão
  if (/torneira|pinga|vazand|vazamento|gotej|sifao|borrachinha|carrapeta/.test(n)) {
    newCtx.intent = "torneira";
    newCtx.details.pain = input;

    if (/sifao|embaixo da pia|debaixo da pia|cano debaixo/.test(n)) {
      const project = getPresetProject("troca-sifao", storeId)!;
      return {
        painTopic: "Vazamento / Sifão",
        response: {
          text: `Identifiquei vazamento sob a pia — normalmente é o **sifão sanfonado** ou vedação gasta.\n\nMontei sua lista pronta (**${formatTotal(
            project
          )}**) com rota até o corredor H2/H3 e tutorial passo a passo.`,
          actionProject: project,
        },
        newContext: newCtx,
      };
    }

    newCtx.step = "torneira:onde";
    return {
      painTopic: "Torneira pingando",
      response: {
        text: "Entendi! Vamos resolver rápido e sem gastar à toa. O vazamento está na **própria torneira** (pingando pelo bico quando fechada) ou no **cano/sifão embaixo da pia**?",
        suggestions: ["Na própria torneira", "No cano embaixo da pia"],
      },
      newContext: newCtx,
    };
  }

  // B. Pintura (se já vier com dimensões + cor, calcula imediatamente!)
  if (/pintar|pintura|tinta|parede.*cor|quarto.*(azul|branco)|rolo de tinta/.test(n)) {
    newCtx.intent = "pintura";
    newCtx.details.pain = input;
    const dims = parseRoomDimensions(input);
    const color = detectColor(input);
    const includeCeiling = /teto/.test(n);

    if (dims && color) {
      const project = buildPaintingProject({
        storeId,
        widthM: dims.width,
        lengthM: dims.length,
        includeCeiling,
        color,
        finish: detectFinish(input),
      });
      return {
        painTopic: "Pintura de cômodo",
        response: {
          text: `Show! Já fiz o cálculo automático para o seu cômodo **${dims.width}×${dims.length}m** em **${color}**${
            includeCeiling ? " (paredes + teto)" : ""
          }:\n\n${project.calculationNote}\n\nMontei a lista completa (**${formatTotal(
            project
          )}**)${
            includeCeiling
              ? " — já incluindo a tinta dedicada para o teto! Quer abrir a lista e a rota?"
              : " — quer ver os produtos e a rota, ou também incluir o teto?"
          }`,
          actionProject: project,
          suggestions: includeCeiling
            ? ["Trocar cor para branco acetinado"]
            : [`Incluir também o teto (${dims.width}x${dims.length}m)`],
        },
        newContext: newCtx,
      };
    }

    if (color) newCtx.details.color = color;
    newCtx.step = "pintura:dimensoes";
    return {
      painTopic: "Pintura de cômodo",
      response: {
        text: "Ótimo projeto! Para eu calcular exatamente quantos litros e latas você precisa sem sobrar nem faltar, me diga:\n\n1. Qual o tamanho aproximado do cômodo? (ex: **3x4m**, **4x5m** ou **18m²**)\n2. Vai pintar **só paredes** ou **paredes e teto**?",
        suggestions: [
          "Quarto 3x4m, só parede",
          "Quarto 4x5m, parede e teto",
          "Sala 5x4m, branco acetinado",
        ],
      },
      newContext: newCtx,
    };
  }

  // C. Trinca / Rachadura / Infiltração / Mofo
  if (/trinca|rachadur|fissur|infiltrac|umidade|mofo|bolor|bolha na parede/.test(n)) {
    newCtx.intent = "trinca";
    newCtx.details.pain = input;

    if (/lista preventiva/.test(n)) {
      const project = getPresetProject("reparo-trinca", storeId)!;
      return {
        painTopic: "Trinca / Infiltração",
        response: {
          text: `Aqui está o kit preventivo completo para trincas superficiais e umidade (**${formatTotal(
            project
          )}**).`,
          actionProject: project,
        },
        newContext: newCtx,
      };
    }

    newCtx.step = "trinca:tamanho";
    return {
      painTopic: "Trinca / Infiltração",
      response: {
        text: "Trincas e umidade podem ser superficiais (fáceis de resolver com massa acrílica + fita telada) ou estruturais.\n\nPara eu indicar o caminho mais seguro: **qual o tamanho aproximado da trinca**? Se preferir, posso chamar um especialista da loja agora mesmo.",
        suggestions: [
          "Menos de 30cm (superficial)",
          "Mais de 30cm ou profunda",
          "Chamar vendedor especialista",
        ],
      },
      newContext: newCtx,
    };
  }

  // D. Instalar Prateleira / Quadro / TV / Bucha
  if (/prateleira|pendurar|quadro|suporte|mao francesa|bucha|furar parede/.test(n)) {
    newCtx.intent = "prateleira";
    newCtx.details.pain = input;
    if (/drywall|gesso|oca/.test(n)) {
      const project = getPresetProject("instalar-prateleira-drywall", storeId)!;
      return {
        painTopic: "Instalar prateleira",
        response: {
          text: `Para parede de **drywall**, a bucha comum espanaria — selecionei buchas próprias para drywall + suportes reforçados + nível (**${formatTotal(
            project
          )}**).`,
          actionProject: project,
        },
        newContext: newCtx,
      };
    }
    newCtx.step = "prateleira:parede";
    return {
      painTopic: "Instalar prateleira",
      response: {
        text: "Bora instalar com firmeza e alinhamento perfeito! A parede onde você vai fixar é de **alvenaria (tijolo/concreto)** ou **drywall (gesso oco)**?",
        suggestions: ["Alvenaria (tijolo/concreto)", "Drywall (parede de gesso)"],
      },
      newContext: newCtx,
    };
  }

  // E. Chuveiro / Resistência / Elétrica
  if (/chuveiro|resistencia|agua fria|ducha|disjuntor|fio derret|tomada/.test(n)) {
    newCtx.intent = "eletrica";
    newCtx.details.pain = input;
    newCtx.step = "eletrica:tipo";
    return {
      painTopic: "Chuveiro / Elétrica",
      response: {
        text: "Vamos resolver com segurança elétrica! O chuveiro **só parou de esquentar** (água sai fria) ou está **desarmando o disjuntor / dando cheiro de fio aquecido**?",
        suggestions: [
          "Só parou de esquentar (resistência)",
          "Disjuntor desarma / fio aquecendo",
          "Chamar técnico de elétrica",
        ],
      },
      newContext: newCtx,
    };
  }

  // F. Iluminação / Lâmpada / LED
  if (/lampada|plafon|led|iluminac|luz queim|quarto escuro|luminaria/.test(n)) {
    newCtx.intent = "iluminacao";
    newCtx.details.pain = input;
    const project = getPresetProject("trocar-iluminacao", storeId)!;
    return {
      painTopic: "Iluminação LED",
      response: {
        text: `Montei um kit de **Iluminação LED** (**${formatTotal(
          project
        )}**) com painel LED 18W de luz branca (gasta bem menos energia), itens de segurança elétrica e passo a passo de instalação.`,
        actionProject: project,
      },
      newContext: newCtx,
    };
  }

  // ================= BUSCA SEMÂNTICA ABERTA (QUALQUER OUTRA PERGUNTA) =================
  const matches = semanticSearchCatalog(input, storeId, { limit: 4 });
  if (matches.length > 0) {
    const customProject = buildProductListProject(
      storeId,
      input,
      matches.map((m) => ({
        productId: m.product.id,
        reason: `Combina com: ${m.matchedTerms.slice(0, 2).join(", ")}`,
      })),
      "busca-semantica"
    );

    const topNames = matches
      .slice(0, 3)
      .map((m) => `• **${m.product.name}** — corredor **${m.product.corridorCode}** (${m.inStock ? `${m.stockQty} un.` : "sem estoque"})`)
      .join("\n");

    return {
      painTopic: "Busca Semântica Livre",
      response: {
        text: `Entendi sua necessidade! Traduzi para os itens correspondentes na sua loja:\n\n${topNames}\n\nJá montei essa lista com rota otimizada — ou posso chamar um especialista se for algo mais específico.`,
        semanticMatches: matches,
        actionProject: customProject,
        suggestions: ["Chamar vendedor especialista", "Resolver outro projeto"],
      },
      newContext: newCtx,
    };
  }

  return {
    painTopic: "Dúvida geral",
    unmet: input.slice(0, 80),
    response: {
      text: "Ainda não encontrei um projeto exato para essa frase. Pode me contar **o que aconteceu ou o que você quer instalar/reformar** — ou enviar uma **foto** pelo botão da câmera?",
      suggestions: [
        "Minha torneira está pingando",
        "Quero pintar um quarto 4x5m",
        "Instalar prateleira na parede",
        "Chuveiro parou de esquentar",
      ],
    },
    newContext: newCtx,
  };
}
