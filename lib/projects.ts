import { getProductById, getStockForStore } from "./catalog";
import { DEFAULT_STORE_ID } from "./stores";
import { DynamicProjectList, ProjectItem, TutorialStep } from "./types";

type ItemSpec = {
  productId: string;
  quantity?: number;
  optional?: boolean;
  reason?: string;
};

const liters = (unit: string) => {
  const match = /(\d+(?:,\d+)?)\s*L\b/.exec(unit);
  return match ? parseFloat(match[1].replace(",", ".")) : null;
};

/** Mantem o volume ao trocar de embalagem (1 lata 18 L -> 5 galoes 3,6 L). */
export function equivalentQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  const from = liters(fromUnit);
  const to = liters(toUnit);
  return from && to ? Math.ceil((quantity * from) / to - 1e-9) : quantity;
}

export function materializeProjectItems(
  specs: ItemSpec[],
  storeId: string
): ProjectItem[] {
  const items: ProjectItem[] = [];

  for (const spec of specs) {
    const prod = getProductById(spec.productId);
    if (!prod) continue;

    const stockQty = getStockForStore(prod, storeId);
    const sub = prod.substituteId ? getProductById(prod.substituteId) : undefined;
    const subStock = sub ? getStockForStore(sub, storeId) : 0;

    items.push({
      productId: prod.id,
      name: prod.name,
      brand: prod.brand,
      leroyExclusive: prod.leroyExclusive,
      imageUrl: prod.imageUrl,
      sku: prod.sku,
      category: prod.category,
      price: prod.price,
      unit: prod.unit,
      quantity: spec.quantity ?? 1,
      aisle: prod.aisle,
      corridorCode: prod.corridorCode,
      shelfLocation: prod.shelfLocation,
      stockQty,
      inStock: stockQty > 0,
      optional: spec.optional,
      reason: spec.reason,
      substituteId: sub && subStock > 0 ? sub.id : undefined,
      substituteName: sub && subStock > 0 ? sub.name : undefined,
      substitutePrice: sub && subStock > 0 ? sub.price : undefined,
      substituteAisle: sub && subStock > 0 ? sub.aisle : undefined,
      substituteShelf: sub && subStock > 0 ? sub.shelfLocation : undefined,
      substituteStockQty: sub && subStock > 0 ? subStock : undefined,
    });
  }

  return items;
}

const TUTORIALS: Record<string, TutorialStep[]> = {
  "reparo-torneira": [
    {
      step: 1,
      title: "Feche o registro geral do cômodo",
      detail: "Gire o registro da parede do banheiro ou cozinha até interromper totalmente o fluxo de água e abra a torneira para aliviar a pressão.",
      durationMin: 2,
      safetyWarning: "Nunca desmonte a torneira com o registro aberto — pode jorrar água sob pressão.",
    },
    {
      step: 2,
      title: "Remova o volante (acabamento) e o reparo antigo",
      detail: "Retire a tampinha superior do volante, solte o parafuso central com a chave de fenda e desrosqueie o mecanismo interno antigo.",
      durationMin: 5,
      tip: "Leve um pano embaixo para não perder o parafuso no ralo (feche o ralo antes!).",
    },
    {
      step: 3,
      title: "Aplique o veda-rosca e instale o reparo novo",
      detail: "Dê 5 a 6 voltas de fita veda-rosca no sentido horário na rosca do reparo universal e rosqueie firmemente sem forçar demais.",
      durationMin: 5,
    },
    {
      step: 4,
      title: "Reabra o registro e teste a vedação",
      detail: "Recoloque o volante, abra o registro aos poucos e verifique se o gotejamento parou completamente.",
      durationMin: 3,
    },
  ],
  "troca-torneira": [
    {
      step: 1,
      title: "Feche o registro e desconecte o engate flexível",
      detail: "Feche o registro da parede, abra a torneira para esvaziar o cano e use a chave inglesa para soltar o engate embaixo da pia.",
      durationMin: 4,
      safetyWarning: "Deixe um balde ou pano embaixo da bancada para aparar a água residual.",
    },
    {
      step: 2,
      title: "Retire a torneira antiga e limpe a bancada",
      detail: "Desrosqueie a porca de fixação por baixo da pia, puxe a torneira antiga e limpe resíduos de silicone ou sujeira.",
      durationMin: 5,
    },
    {
      step: 3,
      title: "Posicione a torneira nova e aplique veda-rosca",
      detail: "Encaixe a nova torneira com o anel de vedação, aperte a porca inferior e aplique 6 voltas de veda-rosca nas conexões.",
      durationMin: 8,
      tip: "Alinhe a bica exatamente no centro do ralo antes do aperto final.",
    },
    {
      step: 4,
      title: "Reconecte o engate e abra o registro",
      detail: "Aperte o engate flexível com a chave inglesa, abra o registro devagar e cheque se há gotas nas conexões inferiores.",
      durationMin: 3,
    },
  ],
  "troca-sifao": [
    {
      step: 1,
      title: "Coloque um balde embaixo e retire o sifão antigo",
      detail: "Desrosqueie a porca superior presa à válvula da pia e desencaixe a ponta inferior do tubo da parede.",
      durationMin: 4,
    },
    {
      step: 2,
      title: "Ajuste o anel adaptador e encaixe o sifão universal",
      detail: "Use o anel correspondente ao diâmetro da válvula da sua pia, rosqueie bem firme com a mão (sem usar alicate para não trincar o plástico).",
      durationMin: 5,
      tip: "Forme uma curva em 'U' (fecho hídrico) no meio do sifão — é essa água parada que bloqueia o mau cheiro do esgoto.",
    },
    {
      step: 3,
      title: "Teste com água corrente",
      detail: "Deixe a torneira aberta por 1 minuto e passe um pano seco nas emendas para confirmar 100% de vedação.",
      durationMin: 2,
    },
  ],
  "pintura-quarto": [
    {
      step: 1,
      title: "Proteja o ambiente antes de abrir a tinta",
      detail: "Estenda a lona plástica no piso, cubra móveis e aplique fita crepe nos rodapés, batentes e espelhos de tomadas.",
      durationMin: 15,
      tip: "Remover as tampas das tomadas (com disjuntor desligado) deixa o acabamento profissional.",
    },
    {
      step: 2,
      title: "Prepare e lixe a superfície",
      detail: "Passe a lixa grão 120 suavemente para remover imperfeições e limpe o pó com pano levemente úmido. Se a parede for nova ou muito escura, aplique o selador/fundo preparador.",
      durationMin: 20,
    },
    {
      step: 3,
      title: "Faça os recortes com a trincha",
      detail: "Pinte primeiro as bordas próximas ao teto, quinas e rodapés com o pincel trincha 2\" criando uma moldura de 5cm.",
      durationMin: 20,
    },
    {
      step: 4,
      title: "Aplique 2 demãos com o rolo antigotas",
      detail: "Dilua a tinta conforme a lata (10–20% água limpa), passe o rolo em movimentos de 'W' e aguarde 4 horas entre a 1ª e a 2ª demão.",
      durationMin: 60,
      tip: "Retire a fita crepe enquanto a 2ª demão ainda estiver levemente úmida para não puxar película de tinta.",
    },
  ],
  "reparo-trinca": [
    {
      step: 1,
      title: "Higienize e abra levemente a trinca",
      detail: "Se houver mofo, aplique o removedor de mofo e espere secar. Raspe tinta solta com a espátula formando um pequeno 'V' limpo na fissura.",
      durationMin: 15,
      safetyWarning: "Se a trinca ultrapassar 3mm de abertura, for diagonal em viga/pilar ou continuar aumentando, acione um especialista.",
    },
    {
      step: 2,
      title: "Aplique a fita telada sobre a fissura",
      detail: "Cole a fita telada autoadesiva centralizada ao longo de toda a trinca. Ela absorve microdilatações e impede que a rachadura volte.",
      durationMin: 5,
    },
    {
      step: 3,
      title: "Cubra com massa acrílica e lixe após secagem",
      detail: "Espalhe 2 camadas finas de massa acrílica com a espátula ultrapassando 5cm de cada lado. Após 4h de secagem, lixe com grão 120 até nivelar.",
      durationMin: 20,
    },
    {
      step: 4,
      title: "Sele e repinte o trecho",
      detail: "Em áreas úmidas (banheiro), aplique impermeabilizante antes da tinta final para bloquear o retorno de bolhas e mofo.",
      durationMin: 15,
    },
  ],
  "instalar-prateleira": [
    {
      step: 1,
      title: "Meça e marque os furos com o nível de bolha",
      detail: "Encoste a prateleira/suporte na altura desejada, use o nível de bolha para alinhar perfeitamente na horizontal e marque os furos a lápis.",
      durationMin: 8,
      safetyWarning: "Antes de furar, verifique se não passa cano de água ou eletroduto na vertical de torneiras e tomadas.",
    },
    {
      step: 2,
      title: "Fure com a broca correta para a bucha",
      detail: "Use broca vídea 8mm para buchas S8 (alvenaria) na profundidade do parafuso + 5mm. Em drywall, use a broca indicada na embalagem da bucha para drywall.",
      durationMin: 8,
      tip: "Prenda um envelope de papel dobrado com fita crepe logo abaixo do furo para capturar toda a poeira.",
    },
    {
      step: 3,
      title: "Fixe buchas, suportes e a prateleira",
      detail: "Encaixe as buchas rente à parede, parafuse as mãos francesas firmemente, apoie a prateleira MDF e prenda os parafusos inferiores.",
      durationMin: 10,
    },
  ],
  "troca-resistencia": [
    {
      step: 1,
      title: "DESLIGUE o disjuntor do chuveiro e confirme",
      detail: "Vá ao quadro de luz, desligue o disjuntor específico do chuveiro e use a chave teste de tensão para ter 100% de certeza de que não há corrente.",
      durationMin: 3,
      safetyWarning: "Obrigatório desligar o disjuntor antes de encostar em qualquer parte do chuveiro.",
    },
    {
      step: 2,
      title: "Abra o espalhador e troque o refil da resistência",
      detail: "Desrosqueie a tampa inferior, puxe o cartucho queimado e encaixe a resistência nova na mesma posição (respeitando os contatos A, B e C).",
      durationMin: 7,
    },
    {
      step: 3,
      title: "Revise os fios com conector Wago (se necessário)",
      detail: "Se notar fios escurecidos ou fita derretida, substitua a emenda por conectores de emenda Wago, de encaixe rápido e seguro contra superaquecimento.",
      durationMin: 8,
    },
    {
      step: 4,
      title: "Deixe correr água fria antes de religar a energia",
      detail: "Com o disjuntor AINDA DESLIGADO, abra o registro do chuveiro por 30 segundos até encher a câmara de água. Só depois ligue o disjuntor.",
      durationMin: 2,
      safetyWarning: "Religar o disjuntor com o chuveiro seco queima a resistência nova instantaneamente!",
    },
  ],
  "trocar-iluminacao": [
    {
      step: 1,
      title: "Desligue o interruptor e o disjuntor de iluminação",
      detail: "Para troca de plafon/painel de teto, desligue o disjuntor e confirme ausência de energia com a chave teste.",
      durationMin: 3,
      safetyWarning: "Nunca trabalhe em fiação de teto confiando apenas no interruptor desligado.",
    },
    {
      step: 2,
      title: "Fixe o suporte e conecte o driver LED",
      detail: "Parafuse a haste metálica na caixa do teto, conecte os fios usando conector Wago ou fita isolante antichama bem firme.",
      durationMin: 10,
    },
    {
      step: 3,
      title: "Encaixe o plafon e religue a energia",
      detail: "Acomode o driver dentro do corpo do painel, prenda nas travas laterais e teste o acendimento.",
      durationMin: 4,
    },
  ],
  "refazer-rejunte": [
    { step: 1, title: "Raspe o rejunte velho", detail: "Passe o raspador nas juntas até tirar 2 a 3mm do rejunte escurecido ou solto. Não force a lâmina contra a borda do azulejo.", durationMin: 25, safetyWarning: "Use óculos: lascas de rejunte podem pular." },
    { step: 2, title: "Limpe e deixe secar", detail: "Aplique o limpador de mofo nas juntas, espere agir, enxágue e deixe secar bem antes do rejunte novo.", durationMin: 15, tip: "Rejunte em junta úmida mancha e não adere." },
    { step: 3, title: "Aplique o rejunte novo", detail: "Preencha as juntas com a espátula em movimentos diagonais e retire o excesso logo em seguida.", durationMin: 20 },
    { step: 4, title: "Limpe o excesso e espere a cura", detail: "Passe pano úmido sobre o azulejo depois de 15 a 30 minutos e evite molhar a área pelo tempo indicado na embalagem.", durationMin: 10 },
  ],
  "pintar-portao": [
    { step: 1, title: "Lixe a ferrugem e a tinta solta", detail: "Use a lixa de ferro até sobrar só metal firme ou tinta bem aderida. Remova o pó com pano seco.", durationMin: 30, safetyWarning: "Use máscara e luvas ao lixar ferrugem." },
    { step: 2, title: "Aplique o fundo para metal", detail: "Passe uma demão fina de fundo nas partes lixadas e espere secar conforme a embalagem.", durationMin: 20 },
    { step: 3, title: "Pinte com esmalte", detail: "Dilua o esmalte com aguarrás se a embalagem indicar e pinte com pincel em camadas finas, no sentido das barras.", durationMin: 40, tip: "Pinte com tempo seco e fora do sol forte para não formar bolhas." },
    { step: 4, title: "Segunda demão e limpeza", detail: "Depois de seco, aplique a segunda demão. Limpe o pincel com aguarrás.", durationMin: 30 },
  ],
  "reparo-caixa-acoplada": [
    { step: 1, title: "Feche o registro do vaso e esvazie a caixa", detail: "Feche o registro atrás do vaso e dê descarga para esvaziar a caixa acoplada.", durationMin: 3 },
    { step: 2, title: "Retire o mecanismo antigo", detail: "Tire a tampa da caixa, solte a mangueira de entrada e desrosqueie o mecanismo gasto.", durationMin: 10, tip: "Tire uma foto antes de desmontar para lembrar a posição das peças." },
    { step: 3, title: "Instale o reparo novo", detail: "Encaixe as peças novas na mesma posição, aperte com a mão e reconecte a entrada de água.", durationMin: 12 },
    { step: 4, title: "Teste o enchimento e a descarga", detail: "Abra o registro, ajuste a altura da boia até a água parar abaixo do ladrão e verifique se não escorre água para o vaso.", durationMin: 5 },
  ],
  "desentupir-pia": [
    { step: 1, title: "Tire a água parada", detail: "Retire o excesso de água da cuba com um copo e um balde para enxergar o ralo.", durationMin: 3 },
    { step: 2, title: "Use o desentupidor", detail: "Encaixe o desentupidor bem sobre o ralo, tampe o ladrão com um pano e bombeie com força algumas vezes.", durationMin: 5 },
    { step: 3, title: "Se não resolver, limpe o sifão", detail: "Com um balde embaixo, desrosqueie o copo do sifão, retire a sujeira e monte de novo.", durationMin: 10, safetyWarning: "Não misture desentupidor líquido com outros produtos de limpeza." },
    { step: 4, title: "Teste com água quente", detail: "Deixe correr água quente por 1 minuto para conferir se a pia escoa normalmente.", durationMin: 2 },
  ],
};

const CAN_LITERS: Record<string, number> = {
  "tin-acrilica-18l-azul": 18,
  "tin-acrilica-36l-azul": 3.6,
  "tin-acrilica-18l-branco": 18,
  "tin-acrilica-36l-branco": 3.6,
};

/** Combinacao mais barata de latas que cobre os litros. ids: lata grande primeiro. */
function cheapestCans(liters: number, ids: string[]): Array<{ productId: string; quantity: number }> {
  const [big, small = big] = ids;
  const price = (id: string) => getProductById(id)?.price ?? Infinity;
  let best = { cost: Infinity, nBig: 0, nSmall: 0 };
  for (let nBig = 0; nBig <= Math.ceil(liters / CAN_LITERS[big]); nBig++) {
    const rest = liters - nBig * CAN_LITERS[big];
    const nSmall = rest > 0 ? Math.ceil(rest / CAN_LITERS[small] - 1e-9) : 0;
    const cost = nBig * price(big) + nSmall * price(small);
    if (cost < best.cost) best = { cost, nBig, nSmall };
  }
  if (big === small) return [{ productId: big, quantity: best.nBig + best.nSmall }];
  return [
    { productId: big, quantity: best.nBig },
    { productId: small, quantity: best.nSmall },
  ].filter((can) => can.quantity > 0);
}

export function buildPaintingProject(params: {
  storeId: string;
  widthM: number;
  lengthM: number;
  includeCeiling: boolean;
  color: "azul" | "branco";
  finish: "fosco" | "acetinado";
}): DynamicProjectList {
  const { storeId, widthM, lengthM, includeCeiling, color, finish } = params;
  const heightM = 2.8;
  const perimeter = 2 * (widthM + lengthM);
  const wallArea = Math.max(8, Math.round(perimeter * heightM - 2.6)); // desconta porta/janela média
  const ceilingArea = includeCeiling ? Math.round(widthM * lengthM) : 0;
  const totalArea = wallArea + ceilingArea;
  // Rendimento prático médio: ~9,5 m² por litro por demão → 2 demãos
  const toLiters = (area: number) => Math.ceil((area * 2) / 9.5);
  const litersNeeded = toLiters(totalArea);
  // Azul so existe fosco no catalogo; branco fosco so em 3,6 L e acetinado so em 18 L.
  const effectiveFinish = color === "azul" ? "fosco" : finish;
  const wallCans = color === "azul" ? ["tin-acrilica-18l-azul", "tin-acrilica-36l-azul"] : [`tin-acrilica-${finish === "acetinado" ? "18l" : "36l"}-branco`];
  // Teto em cor diferente: parede e teto calculados separados para nao somar a area duas vezes.
  const separateCeiling = includeCeiling && color !== "branco";
  const wallLiters = separateCeiling ? toLiters(wallArea) : litersNeeded;

  const specs: ItemSpec[] = [
    ...cheapestCans(wallLiters, wallCans).map((can) => ({
      ...can,
      reason: `Calculado para ${separateCeiling ? wallArea : totalArea}m² em 2 demãos (~${wallLiters}L necessários)`,
    })),
    { productId: "tin-rolo-bandeja", quantity: 1, reason: "Aplicação uniforme sem respingos" },
    { productId: "tin-trincha", quantity: 1, reason: "Recortes em cantos e rodapés" },
    { productId: "tin-fita-crepe", quantity: 1, reason: "Proteção de batentes e rodapés" },
    { productId: "tin-lona", quantity: 1, reason: "Proteção do piso e móveis" },
    { productId: "tin-lixa-120", quantity: 3, reason: "Nivelamento antes da pintura" },
    {
      productId: "tin-selador",
      quantity: 1,
      optional: true,
      reason: "Opcional: recomendado para parede nova ou cobertura de cor escura",
    },
  ];

  if (separateCeiling) {
    specs.splice(1, 0, ...cheapestCans(toLiters(ceilingArea), ["tin-acrilica-36l-branco"]).map((can) => ({
      ...can,
      reason: `Tinta branca dedicada para o teto (${ceilingArea}m²)`,
    })));
  }

  const colorLabel = color === "azul" ? "azul sereno" : "branco neve";
  const finishLabel = effectiveFinish;
  const id = `pintura-${widthM}x${lengthM}-${color}-${includeCeiling ? "teto" : "parede"}`.replace(
    /\./g,
    "_"
  );

  return {
    id,
    title: `Pintura ${widthM}×${lengthM}m (${colorLabel})`,
    subtitle: `${totalArea}m² calculados · 2 demãos · acabamento ${finishLabel}`,
    description: `Cálculo automático para cômodo de ${widthM}×${lengthM}m (pé-direito 2,80m)${
      includeCeiling ? " incluindo teto" : ", somente paredes"
    }. Estimativa de ${litersNeeded}L de tinta com todos os acessórios de preparação e proteção.`,
    storeId,
    difficulty: "Fácil",
    estimatedInstallMin: 120,
    sourceIntent: "pintura",
    calculationNote: `Área útil: ${wallArea}m² de paredes${
      includeCeiling ? ` + ${ceilingArea}m² de teto` : ""
    } = ${totalArea}m² × 2 demãos → ~${litersNeeded}L de tinta.`,
    items: materializeProjectItems(specs, storeId),
    tutorial: TUTORIALS["pintura-quarto"],
    createdAt: Date.now(),
  };
}

export function getPresetProject(
  id: string,
  storeId: string = DEFAULT_STORE_ID
): DynamicProjectList | null {
  switch (id) {
    case "reparo-torneira":
      return {
        id: "reparo-torneira",
        title: "Reparo de torneira pingando",
        subtitle: "Troca da vedação interna · solução rápida e econômica",
        description:
          "Kit completo para eliminar o gotejamento trocando apenas o mecanismo interno (reparo) da torneira — resolve cerca de 80% dos casos sem precisar trocar a peça inteira.",
        storeId,
        difficulty: "Fácil",
        estimatedInstallMin: 15,
        sourceIntent: "torneira",
        items: materializeProjectItems(
          [
            { productId: "hid-reparo-univ", quantity: 1, reason: "Substitui a vedação gasta" },
            { productId: "hid-veda-rosca", quantity: 1, reason: "Evita vazamento na rosca" },
            { productId: "fer-chave-fenda", quantity: 1, reason: "Solta o volante da torneira" },
            {
              productId: "lim-pano-multiuso",
              quantity: 1,
              optional: true,
              reason: "Limpeza e proteção do ralo durante a troca",
            },
          ],
          storeId
        ),
        tutorial: TUTORIALS["reparo-torneira"],
        createdAt: Date.now(),
      };

    case "reparo-monocomando":
      return {
        id: "reparo-monocomando",
        title: "Reparo de torneira monocomando",
        subtitle: "Cartucho cerâmico 35mm + vedação",
        description:
          "Solução para torneiras de uma alavanca que continuam pingando mesmo fechadas. Inclui cartucho cerâmico, veda-rosca e ferramenta básica.",
        storeId,
        difficulty: "Moderado",
        estimatedInstallMin: 20,
        sourceIntent: "torneira",
        items: materializeProjectItems(
          [
            { productId: "hid-cartucho-mono", quantity: 1, reason: "Vedação interna do misturador" },
            { productId: "hid-veda-rosca", quantity: 1, reason: "Vedação segura das roscas" },
            { productId: "fer-chave-inglesa", quantity: 1, reason: "Solta a porca do cartucho" },
            { productId: "lim-pano-multiuso", quantity: 1, optional: true },
          ],
          storeId
        ),
        tutorial: TUTORIALS["reparo-torneira"],
        createdAt: Date.now(),
      };

    case "troca-torneira":
      return {
        id: "troca-torneira",
        title: "Troca completa da torneira",
        subtitle: "Torneira monocomando nova + acessórios de instalação",
        description:
          "Solução definitiva e moderna para torneiras antigas ou oxidadas, com tudo o que você precisa para instalar em menos de 20 minutos.",
        storeId,
        difficulty: "Fácil",
        estimatedInstallMin: 20,
        sourceIntent: "torneira",
        items: materializeProjectItems(
          [
            { productId: "hid-torneira-mono", quantity: 1, reason: "Torneira monocomando nova" },
            { productId: "hid-engate-flex", quantity: 1, reason: "Conexão segura à parede" },
            { productId: "hid-veda-rosca", quantity: 1, reason: "Veda as roscas sem gotejar" },
            { productId: "fer-chave-inglesa", quantity: 1, reason: "Aperto das porcas inferiores" },
          ],
          storeId
        ),
        tutorial: TUTORIALS["troca-torneira"],
        createdAt: Date.now(),
      };

    case "troca-sifao":
      return {
        id: "troca-sifao",
        title: "Troca do sifão embaixo da pia",
        subtitle: "Fim do vazamento inferior e do mau cheiro",
        description:
          "Kit prático para substituir o sifão ressecado ou furado debaixo da pia/lavatório usando encaixe universal sem precisar de ferramentas pesadas.",
        storeId,
        difficulty: "Fácil",
        estimatedInstallMin: 12,
        sourceIntent: "torneira",
        items: materializeProjectItems(
          [
            { productId: "hid-sifao-univ", quantity: 1, reason: "Compatível com qualquer pia" },
            { productId: "hid-veda-rosca", quantity: 1, reason: "Reforço extra na rosca" },
            { productId: "hid-silicone-antimofo", quantity: 1, optional: true, reason: "Veda frestas da cuba" },
            { productId: "lim-pano-multiuso", quantity: 1, optional: true },
          ],
          storeId
        ),
        tutorial: TUTORIALS["troca-sifao"],
        createdAt: Date.now(),
      };

    case "pintura-quarto":
      return buildPaintingProject({
        storeId,
        widthM: 3,
        lengthM: 4,
        includeCeiling: false,
        color: "azul",
        finish: "fosco",
      });

    case "reparo-trinca":
      return {
        id: "reparo-trinca",
        title: "Reparo de trinca superficial e umidade",
        subtitle: "Tratamento completo contra fissuras e retorno de mofo",
        description:
          "Kit para tratar trincas superficiais (< 30cm) em banheiros ou quartos usando fita telada + massa acrílica antimofo para evitar que a rachadura volte.",
        storeId,
        difficulty: "Moderado",
        estimatedInstallMin: 55,
        sourceIntent: "trinca",
        items: materializeProjectItems(
          [
            { productId: "mat-massa-acrilica", quantity: 1, reason: "Resistente à umidade do banheiro" },
            { productId: "mat-fita-telada", quantity: 1, reason: "Impede a trinca de reabrir" },
            { productId: "mat-espatula-aco", quantity: 1, reason: "Raspagem e aplicação lisa" },
            { productId: "tin-lixa-120", quantity: 1, reason: "Acabamento nivelado" },
            { productId: "lim-removedor-mofo", quantity: 1, reason: "Higieniza fungos antes da massa" },
            {
              productId: "mat-impermeabilizante",
              quantity: 1,
              optional: true,
              reason: "Recomendado se houver manchas de umidade",
            },
          ],
          storeId
        ),
        tutorial: TUTORIALS["reparo-trinca"],
        createdAt: Date.now(),
      };

    case "instalar-prateleira":
    case "instalar-prateleira-drywall": {
      const isDrywall = id === "instalar-prateleira-drywall";
      return {
        id,
        title: isDrywall
          ? "Instalação de prateleira em Drywall"
          : "Instalação de prateleira em Alvenaria",
        subtitle: isDrywall
          ? "Buchas para gesso + suportes reforçados"
          : "Buchas de 8mm + brocas + nivelamento preciso",
        description: isDrywall
          ? "Kit seguro para paredes ocas de gesso acartonado (drywall), com buchas especiais de expansão que evitam que o parafuso solte."
          : "Tudo o que você precisa para fixar sua prateleira reta e firme em parede de tijolo ou concreto, com suportes reforçados.",
        storeId,
        difficulty: "Moderado",
        estimatedInstallMin: 25,
        sourceIntent: "prateleira",
        items: materializeProjectItems(
          [
            { productId: "fix-prateleira-mdf", quantity: 1, reason: "Prateleira branca 90×30cm" },
            { productId: "fix-mao-francesa", quantity: 2, reason: "Par de suportes reforçados" },
            {
              productId: isDrywall ? "fix-bucha-drywall" : "fix-bucha-s8",
              quantity: 1,
              reason: isDrywall ? "Própria para gesso/drywall" : "Fixação firme em alvenaria",
            },
            { productId: "fer-kit-brocas", quantity: 1, reason: "Brocas para concreto e madeira" },
            { productId: "fer-nivel-bolha", quantity: 1, reason: "Garante alinhamento reto" },
            {
              productId: "fer-furadeira",
              quantity: 1,
              optional: true,
              reason: "Opcional caso você ainda não tenha furadeira em casa",
            },
          ],
          storeId
        ),
        tutorial: TUTORIALS["instalar-prateleira"],
        createdAt: Date.now(),
      };
    }

    case "troca-resistencia":
      return {
        id: "troca-resistencia",
        title: "Troca de resistência do chuveiro",
        subtitle: "Reparo elétrico seguro com conector Wago",
        description:
          "Volte a ter água quente em 20 minutos com segurança reforçada: inclui resistência original, conector de emenda Wago (evita emenda derretida) e chave teste.",
        storeId,
        difficulty: "Moderado",
        estimatedInstallMin: 20,
        sourceIntent: "eletrica",
        items: materializeProjectItems(
          [
            { productId: "ele-resistencia-univ", quantity: 1, reason: "Reposição para água quente" },
            { productId: "ele-conector-wago", quantity: 1, reason: "Conexão segura que não derrete" },
            { productId: "ele-chave-teste", quantity: 1, reason: "Confirma energia desligada" },
            {
              productId: "ele-chuveiro-eletronico",
              quantity: 1,
              optional: true,
              reason: "Opcional se preferir trocar por um chuveiro novo",
            },
          ],
          storeId
        ),
        tutorial: TUTORIALS["troca-resistencia"],
        createdAt: Date.now(),
      };

    case "trocar-iluminacao":
      return {
        id: "trocar-iluminacao",
        title: "Upgrade de iluminação LED",
        subtitle: "Mais claridade com até 85% de economia",
        description:
          "Kit prático para substituir luminária antiga por painel LED moderno de luz branca + itens de segurança elétrica.",
        storeId,
        difficulty: "Fácil",
        estimatedInstallMin: 18,
        sourceIntent: "iluminacao",
        items: materializeProjectItems(
          [
            { productId: "ele-painel-led-18w", quantity: 1, reason: "Luz branca uniforme" },
            { productId: "ele-fita-isolante", quantity: 1, reason: "Isola as emendas" },
            { productId: "ele-chave-teste", quantity: 1, reason: "Confirma circuito desligado" },
            {
              productId: "ele-lampada-led-9w",
              quantity: 1,
              optional: true,
              reason: "Luz amarela extra para abajur ou ponto auxiliar",
            },
          ],
          storeId
        ),
        tutorial: TUTORIALS["trocar-iluminacao"],
        createdAt: Date.now(),
      };

    case "refazer-rejunte":
      return {
        id: "refazer-rejunte",
        title: "Refazer rejunte do banheiro",
        subtitle: "Rejunte novo sem mofo em um fim de semana",
        description:
          "Para rejunte escuro, mofado ou soltando no box e no piso: raspador, limpador de mofo e rejunte para área úmida.",
        storeId,
        difficulty: "Moderado",
        estimatedInstallMin: 70,
        sourceIntent: "rejunte",
        items: materializeProjectItems(
          [
            { productId: "mat-raspador-rejunte", quantity: 1, reason: "Tira o rejunte velho sem lascar o azulejo" },
            { productId: "lim-removedor-mofo", quantity: 1, reason: "Limpa o mofo antes do rejunte novo" },
            { productId: "mat-rejunte-branco", quantity: 2, reason: "Próprio para box e área úmida" },
            { productId: "mat-espatula-aco", quantity: 1, reason: "Aplica e nivela o rejunte" },
            { productId: "lim-pano-multiuso", quantity: 1, reason: "Remove o excesso do azulejo" },
            { productId: "mat-rejunte-cinza", quantity: 1, optional: true, reason: "Alternativa cinza que disfarça manchas" },
          ],
          storeId
        ),
        tutorial: TUTORIALS["refazer-rejunte"],
        createdAt: Date.now(),
      };

    case "pintar-portao":
      return {
        id: "pintar-portao",
        title: "Pintar portão ou grade de ferro",
        subtitle: "Fim da ferrugem com fundo e esmalte",
        description:
          "Para portão, grade ou janela de ferro descascando: lixa de metal, fundo de aderência, esmalte sintético e aguarrás.",
        storeId,
        difficulty: "Moderado",
        estimatedInstallMin: 120,
        sourceIntent: "portao",
        items: materializeProjectItems(
          [
            { productId: "tin-lixa-ferro", quantity: 3, reason: "Tira ferrugem e tinta solta" },
            { productId: "tin-fundo-galvanizado", quantity: 1, reason: "Faz o esmalte aderir no metal" },
            { productId: "tin-esmalte-preto", quantity: 1, reason: "Acabamento resistente ao tempo" },
            { productId: "tin-pincel-esmalte", quantity: 1, reason: "Pincel próprio para esmalte" },
            { productId: "tin-aguarras", quantity: 1, reason: "Dilui o esmalte e limpa o pincel" },
            { productId: "tin-lona", quantity: 1, optional: true, reason: "Protege o piso de respingos" },
          ],
          storeId
        ),
        tutorial: TUTORIALS["pintar-portao"],
        createdAt: Date.now(),
      };

    case "reparo-caixa-acoplada":
      return {
        id: "reparo-caixa-acoplada",
        title: "Conserto da caixa acoplada",
        subtitle: "Descarga que não para de encher ou vaza no vaso",
        description:
          "Kit de reparo para a caixa acoplada que deixa água escorrendo no vaso ou não para de encher, com a opção do mecanismo completo.",
        storeId,
        difficulty: "Fácil",
        estimatedInstallMin: 30,
        sourceIntent: "descarga",
        items: materializeProjectItems(
          [
            { productId: "hid-reparo-caixa", quantity: 1, reason: "Troca as vedações gastas da caixa" },
            { productId: "hid-veda-rosca", quantity: 1, reason: "Veda a entrada de água" },
            { productId: "hid-engate-flex", quantity: 1, optional: true, reason: "Mangueira nova se a antiga estiver ressecada" },
            { productId: "hid-mecanismo-caixa", quantity: 1, optional: true, reason: "Se o reparo não resolver, troque o mecanismo" },
          ],
          storeId
        ),
        tutorial: TUTORIALS["reparo-caixa-acoplada"],
        createdAt: Date.now(),
      };

    case "desentupir-pia":
      return {
        id: "desentupir-pia",
        title: "Desentupir pia ou ralo",
        subtitle: "Água descendo de novo sem chamar encanador",
        description:
          "Para pia, tanque ou ralo com água parada: desentupidor manual primeiro e produto líquido para gordura.",
        storeId,
        difficulty: "Fácil",
        estimatedInstallMin: 20,
        sourceIntent: "entupimento",
        items: materializeProjectItems(
          [
            { productId: "hid-desentupidor", quantity: 1, reason: "Resolve a maioria dos entupimentos" },
            { productId: "lim-desentupidor-liquido", quantity: 1, reason: "Dissolve gordura no cano" },
            { productId: "fer-chave-inglesa", quantity: 1, optional: true, reason: "Abre o sifão se precisar limpar" },
            { productId: "hid-sifao-univ", quantity: 1, optional: true, reason: "Troque se o sifão estiver rachado" },
          ],
          storeId
        ),
        tutorial: TUTORIALS["desentupir-pia"],
        createdAt: Date.now(),
      };

    default:
      return null;
  }
}

export const ALL_PRESET_IDS = [
  "reparo-torneira",
  "reparo-monocomando",
  "troca-torneira",
  "troca-sifao",
  "pintura-quarto",
  "reparo-trinca",
  "instalar-prateleira",
  "instalar-prateleira-drywall",
  "troca-resistencia",
  "trocar-iluminacao",
  "refazer-rejunte",
  "pintar-portao",
  "reparo-caixa-acoplada",
  "desentupir-pia",
];
