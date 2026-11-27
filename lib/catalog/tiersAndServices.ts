import { materializeProjectItems } from "./projects";
import { BudgetTierId, InstallServiceOption, ProjectItem } from "../types";

export type TierOption = {
  id: BudgetTierId;
  label: string;
  tagline: string;
  durability: string;
  specs: { productId: string; quantity?: number; optional?: boolean; reason?: string }[];
};

const TIERS_BY_INTENT: Record<string, TierOption[]> = {
  torneira: [
    {
      id: "economico",
      label: "Econômico",
      tagline: "Troca só da vedação interna",
      durability: "2–3 anos",
      specs: [
        { productId: "hid-reparo-univ", quantity: 1, reason: "Resolve ~80% dos gotejamentos" },
        { productId: "hid-veda-rosca", quantity: 1, reason: "Vedação obrigatória na rosca" },
        { productId: "fer-chave-fenda", quantity: 1, reason: "Remoção do volante" },
      ],
    },
    {
      id: "recomendado",
      label: "Recomendado",
      tagline: "Torneira 1/4 volta + engate novo",
      durability: "8+ anos",
      specs: [
        { productId: "hid-torneira-bica", quantity: 1, reason: "Mecanismo cerâmico 1/4 de volta" },
        { productId: "hid-engate-flex", quantity: 1, reason: "Substitui mangueira ressecada" },
        { productId: "hid-veda-rosca", quantity: 1, reason: "Vedação de roscas" },
        { productId: "fer-chave-inglesa", quantity: 1, reason: "Aperto sob a bancada" },
      ],
    },
    {
      id: "profissional",
      label: "Durável / Pro",
      tagline: "Monocomando cromada + vedação completa",
      durability: "12+ anos",
      specs: [
        { productId: "hid-torneira-mono", quantity: 1, reason: "Acabamento premium + arejador" },
        { productId: "hid-engate-flex", quantity: 1, reason: "Malha de aço inox durável" },
        { productId: "hid-veda-rosca", quantity: 1, reason: "PTFE alta densidade" },
        { productId: "hid-silicone-antimofo", quantity: 1, reason: "Sela a base contra infiltração" },
        { productId: "fer-chave-inglesa", quantity: 1, reason: "Instalação firme sem arranhar" },
      ],
    },
  ],
  pintura: [
    {
      id: "economico",
      label: "Econômico",
      tagline: "Galão fosco + essencial",
      durability: "Retoque / 1 parede",
      specs: [
        { productId: "tin-acrilica-36l-azul", quantity: 2, reason: "2 galões 3,6L (7,2L) para área compacta" },
        { productId: "tin-rolo-bandeja", quantity: 1, reason: "Aplicação rápida" },
        { productId: "tin-fita-crepe", quantity: 1, reason: "Proteção de rodapés" },
        { productId: "tin-lixa-120", quantity: 1, reason: "Lixamento básico" },
      ],
    },
    {
      id: "recomendado",
      label: "Recomendado",
      tagline: "Lata 18L Fosca + proteção total",
      durability: "5+ anos · esconde imperfeições",
      specs: [
        { productId: "tin-acrilica-18l-azul", quantity: 1, reason: "Melhor custo por m² em 2 demãos" },
        { productId: "tin-rolo-bandeja", quantity: 1, reason: "Lã antigotas para acabamento liso" },
        { productId: "tin-trincha", quantity: 1, reason: "Recorte limpo em cantos" },
        { productId: "tin-fita-crepe", quantity: 1, reason: "Proteção sem resíduo" },
        { productId: "tin-lona", quantity: 1, reason: "Piso protegido contra respingos" },
        { productId: "tin-lixa-120", quantity: 1, reason: "Preparação uniforme" },
        { productId: "tin-selador", quantity: 1, optional: true, reason: "Opcional: selagem de reboco" },
      ],
    },
    {
      id: "profissional",
      label: "Durável / Pro",
      tagline: "Acetinada lavável + Fundo Preparador",
      durability: "8+ anos · super lavável",
      specs: [
        { productId: "tin-acrilica-18l-branco", quantity: 1, reason: "Acetinada lavável sem cheiro" },
        { productId: "tin-fundo-prep", quantity: 1, reason: "Aderência máxima e economia de tinta" },
        { productId: "tin-rolo-bandeja", quantity: 1, reason: "Kit rolo antigotas" },
        { productId: "tin-trincha", quantity: 1, reason: "Acabamento fino em molduras" },
        { productId: "tin-fita-crepe", quantity: 1, reason: "Proteção imobiliária" },
        { productId: "tin-lona", quantity: 1, reason: "Proteção 4×5m" },
        { productId: "tin-lixa-120", quantity: 1, reason: "Nivelamento fino" },
      ],
    },
  ],
  eletrica: [
    {
      id: "economico",
      label: "Econômico",
      tagline: "Somente troca da resistência + Wago",
      durability: "Reparo rápido",
      specs: [
        { productId: "ele-resistencia-univ", quantity: 1, reason: "Resistência original 220V" },
        { productId: "ele-conector-wago", quantity: 1, reason: "Segurança contra derretimento" },
        { productId: "ele-chave-teste", quantity: 1, reason: "Confirma circuito desligado" },
      ],
    },
    {
      id: "recomendado",
      label: "Recomendado",
      tagline: "Chuveiro eletrônico novo + kit seguro",
      durability: "5+ anos · controle gradual",
      specs: [
        { productId: "ele-chuveiro-eletronico", quantity: 1, reason: "Controle gradual 7500W" },
        { productId: "ele-conector-wago", quantity: 1, reason: "Emenda segura a mola" },
        { productId: "hid-veda-rosca", quantity: 1, reason: "Veda o cano de entrada" },
        { productId: "ele-chave-teste", quantity: 1, reason: "Segurança na instalação" },
      ],
    },
    {
      id: "profissional",
      label: "Durável / Pro",
      tagline: "Chuveiro novo + resistência reserva + isolamento",
      durability: "Zero imprevistos no inverno",
      specs: [
        { productId: "ele-chuveiro-eletronico", quantity: 1, reason: "Chuveiro eletrônico 7500W" },
        { productId: "ele-resistencia-univ", quantity: 1, reason: "Peça reserva pronta em casa" },
        { productId: "ele-conector-wago", quantity: 1, reason: "Conector de emenda Wago" },
        { productId: "ele-fita-isolante", quantity: 1, reason: "Acabamento isolante antichama" },
        { productId: "ele-chave-teste", quantity: 1, reason: "Chave teste digital" },
      ],
    },
  ],
  prateleira: [
    {
      id: "economico",
      label: "Econômico",
      tagline: "Só fixação (já tenho furadeira)",
      durability: "Até 40kg",
      specs: [
        { productId: "fix-prateleira-mdf", quantity: 1, reason: "MDF 80×25cm 18mm" },
        { productId: "fix-mao-francesa", quantity: 1, reason: "Par reforçado até 40kg" },
        { productId: "fix-bucha-s8", quantity: 1, reason: "Bucha S8 com anel" },
        { productId: "fer-kit-brocas", quantity: 1, reason: "Broca vídea compatível 8mm" },
      ],
    },
    {
      id: "recomendado",
      label: "Recomendado",
      tagline: "Kit + Nível de Bolha",
      durability: "Instalação 100% reta",
      specs: [
        { productId: "fix-prateleira-mdf", quantity: 1, reason: "MDF 80×25cm" },
        { productId: "fix-mao-francesa", quantity: 1, reason: "Par mão francesa 25cm" },
        { productId: "fix-bucha-s8", quantity: 1, reason: "Fixação alvenaria S8" },
        { productId: "fer-kit-brocas", quantity: 1, reason: "Vídea 6/8/10mm" },
        { productId: "fer-nivel-bolha", quantity: 1, reason: "Nivelamento perfeito" },
      ],
    },
    {
      id: "profissional",
      label: "Kit Obra Completa",
      tagline: "Inclui Furadeira/Parafusadeira 12V",
      durability: "Pronto para próximos projetos",
      specs: [
        { productId: "fix-prateleira-mdf", quantity: 1, reason: "MDF 80×25cm" },
        { productId: "fix-mao-francesa", quantity: 1, reason: "Par mão francesa 25cm" },
        { productId: "fix-bucha-s8", quantity: 1, reason: "Fixação alvenaria S8" },
        { productId: "fer-kit-brocas", quantity: 1, reason: "Vídea 6/8/10mm" },
        { productId: "fer-nivel-bolha", quantity: 1, reason: "Nível magnético 30cm" },
        { productId: "fer-furadeira", quantity: 1, reason: "Furadeira impacto 12V + maleta" },
      ],
    },
  ],
};

export function getTiersForIntent(intent: string): TierOption[] {
  return TIERS_BY_INTENT[intent] ?? [];
}

export function materializeTierItems(
  intent: string,
  tierId: BudgetTierId,
  storeId: string,
  options?: { isDrywall?: boolean }
): ProjectItem[] | null {
  const tiers = TIERS_BY_INTENT[intent];
  if (!tiers) return null;
  const tier = tiers.find((t) => t.id === tierId);
  if (!tier) return null;
  const specs = options?.isDrywall
    ? tier.specs.map((s) =>
        s.productId === "fix-bucha-s8"
          ? {
              ...s,
              productId: "fix-bucha-drywall",
              reason: "Bucha própria para gesso/drywall",
            }
          : s
      )
    : tier.specs;
  return materializeProjectItems(specs, storeId);
}

/**
 * Serviços oficiais "Leroy Merlin Instala" — conecta a jornada DIY à estratégia real
 * de receita de serviços certificados da Leroy Merlin Brasil.
 */
const INSTALL_SERVICES: Record<string, InstallServiceOption> = {
  torneira: {
    code: "LMI-HID-01",
    title: "Leroy Merlin Instala · Troca / Reparo de Torneira ou Sifão",
    description:
      "Instalador certificado vai até sua casa, executa a troca com teste de pressão e limpa o local.",
    price: 119.0,
    warrantyMonths: 12,
    estimatedDuration: "Até 1h em casa",
    includes: [
      "Mão de obra certificada Leroy Merlin",
      "Teste completo de estanqueidade",
      "1 ano de garantia no serviço",
    ],
  },
  pintura: {
    code: "LMI-PIN-04",
    title: "Leroy Merlin Instala · Pintura de Ambiente (até 40m²)",
    description:
      "Pintor homologado com proteção de móveis, preparação de parede e 2 demãos com acabamento fino.",
    price: 389.0,
    warrantyMonths: 12,
    estimatedDuration: "1 dia útil",
    includes: [
      "Proteção completa do ambiente",
      "Lixamento, recorte e 2 demãos",
      "Garantia oficial de 12 meses",
    ],
  },
  trinca: {
    code: "LMI-OBR-02",
    title: "Leroy Merlin Instala · Visita Técnica + Reparo de Fissura",
    description:
      "Especialista avalia origem da umidade/trinca e realiza tratamento com fita telada e impermeabilização.",
    price: 229.0,
    warrantyMonths: 12,
    estimatedDuration: "Meio período",
    includes: [
      "Avaliação de umidade no local",
      "Tratamento completo com fita telada",
      "Garantia oficial de 12 meses",
    ],
  },
  prateleira: {
    code: "LMI-FIX-03",
    title: "Leroy Merlin Instala · Fixação de Prateleiras / Suportes (até 3 un.)",
    description:
      "Detecção de tubulação oculta, furação sem poeira com nivelamento a laser e fixação certificada.",
    price: 129.0,
    warrantyMonths: 12,
    estimatedDuration: "Até 1h30",
    includes: [
      "Detector de canos/fios na parede",
      "Nivelamento a laser",
      "1 ano de garantia Leroy Merlin",
    ],
  },
  eletrica: {
    code: "LMI-ELE-01",
    title: "Leroy Merlin Instala · Instalação Segura de Chuveiro Elétrico",
    description:
      "Eletricista credenciado verifica disjuntor, bitola do fio, instala com conector Wago e testa aterramento.",
    price: 139.0,
    warrantyMonths: 12,
    estimatedDuration: "Até 1h",
    includes: [
      "Auditoria do disjuntor e fiação",
      "Conexão segura com conector Wago",
      "Garantia de 12 meses",
    ],
  },
  iluminacao: {
    code: "LMI-ELE-05",
    title: "Leroy Merlin Instala · Instalação de Plafon / Painel LED (até 2 pontos)",
    description:
      "Troca segura com teste de circuito, fixação no teto/gesso e descarte da luminária antiga.",
    price: 119.0,
    warrantyMonths: 12,
    estimatedDuration: "Até 1h",
    includes: [
      "Teste elétrico com multímetro",
      "Instalação limpa e nivelada",
      "Garantia de 12 meses",
    ],
  },
};

// Sem servico correspondente nao oferece nada: antes caia em "instalacao de torneira" para qualquer lista.
export function getInstallServiceForIntent(intent: string): InstallServiceOption | undefined {
  return INSTALL_SERVICES[intent];
}
