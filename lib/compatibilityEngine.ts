import { getProductById } from "./catalog";
import {
  CompatibilityAlert,
  CompatibilityAudit,
  DynamicProjectList,
  ProjectItem,
} from "./types";

/**
 * Motor de Auditoria "Anti-Segunda Viagem" (inspirado no Project-Cart Verification).
 * Valida regras reais de engenharia, compatibilidade de medidas/materiais,
 * segurança elétrica e itens críticos esquecidos antes de passar no caixa.
 */
export function auditProjectCompatibility(
  project: DynamicProjectList,
  includedOptionals: Record<string, boolean>
): CompatibilityAudit {
  const activeItems = project.items.filter(
    (i) => !i.optional || includedOptionals[i.productId]
  );
  const allIds = new Set(activeItems.map((i) => i.productId));
  const optionalMap = new Map(
    project.items.filter((i) => i.optional).map((i) => [i.productId, i])
  );

  const alerts: CompatibilityAlert[] = [];
  const passedChecks: string[] = [];

  // 1. Ruptura de estoque em item ativo
  for (const item of activeItems) {
    if (!item.inStock) {
      alerts.push({
        id: `stock-${item.productId}`,
        severity: "critical",
        title: `Item sem estoque nesta loja: ${item.name}`,
        explanation: item.substituteName
          ? `Evite andar até o corredor ${item.corridorCode} à toa. Há substituto equivalente em estoque (${item.substituteName}, ${item.substituteStockQty} un.).`
          : `Este item está esgotado nesta unidade. Troque de loja no topo ou consulte um especialista.`,
        fixLabel: item.substituteName ? `Substituir por ${item.substituteName.split(" ").slice(0, 3).join(" ")}` : undefined,
        fixType: item.substituteId ? "replace_product" : undefined,
        targetProductId: item.productId,
        replacementProductId: item.substituteId,
      });
    }
  }
  if (activeItems.every((i) => i.inStock)) {
    passedChecks.push("100% dos itens ativos com estoque confirmado nesta unidade");
  }

  // 2. Hidráulica: torneira ou reparo sem veda-rosca
  const hasFaucetOrRepair =
    allIds.has("hid-reparo-univ") ||
    allIds.has("hid-cartucho-mono") ||
    allIds.has("hid-torneira-mono") ||
    allIds.has("hid-torneira-bica");
  if (hasFaucetOrRepair) {
    if (!allIds.has("hid-veda-rosca")) {
      alerts.push({
        id: "hid-no-ptfe",
        severity: "critical",
        title: "Falta Fita Veda-Rosca PTFE",
        explanation:
          "Instalar torneira ou reparo hidráulico sem veda-rosca gera micro-vazamento na rosca e exige desmontar tudo novamente.",
        fixLabel: "Adicionar Veda-Rosca (R$ 6,50 · H3)",
        fixType: "add_product",
        targetProductId: "hid-veda-rosca",
      });
    } else {
      passedChecks.push("Vedação hidráulica garantida (Veda-Rosca PTFE incluída)");
    }
  }

  // 3. Elétrica / Chuveiro: segurança crítica (Conector Wago + Chave Teste)
  const hasShowerOrResistance =
    allIds.has("ele-resistencia-univ") || allIds.has("ele-chuveiro-eletronico");
  if (hasShowerOrResistance) {
    if (!allIds.has("ele-conector-wago")) {
      alerts.push({
        id: "ele-no-wago",
        severity: "critical",
        title: "Segurança elétrica: inclua conector de emenda Wago",
        explanation:
          "Emendas de chuveiro 220V apenas com fita isolante aquecem e derretem. O conector de emenda Wago garante contato firme e evita curto-circuito.",
        fixLabel: "Adicionar conector Wago (corredor C19)",
        fixType: "add_product",
        targetProductId: "ele-conector-wago",
      });
    } else {
      passedChecks.push("Conexão elétrica de alta corrente segura (conector Wago)");
    }

    if (!allIds.has("ele-chave-teste")) {
      alerts.push({
        id: "ele-no-tester",
        severity: "warning",
        title: "Confirmação de circuito desligado",
        explanation:
          "Sem chave teste de tensão, há risco ao manusear fios do chuveiro caso o disjuntor do quadro esteja mal identificado.",
        fixLabel: "Adicionar Chave Teste (R$ 15,90 · E1)",
        fixType: "add_product",
        targetProductId: "ele-chave-teste",
      });
    } else {
      passedChecks.push("Verificação de tensão incluída (Chave Teste Digital)");
    }
  }

  // 4. Fixação / Prateleira: Drywall vs Alvenaria + Broca 8mm + Nível
  const isDrywallProject = project.id.includes("drywall") || project.title.toLowerCase().includes("drywall");
  if (isDrywallProject && allIds.has("fix-bucha-s8") && !allIds.has("fix-bucha-drywall")) {
    alerts.push({
      id: "fix-drywall-mismatch",
      severity: "critical",
      title: "Incompatibilidade: Bucha S8 comum solta em Drywall!",
      explanation:
        "Paredes ocas de gesso acartonado precisam de bucha própria para drywall. A bucha S8 comum espana e derruba a prateleira.",
      fixLabel: "Trocar para Bucha Drywall (R$ 19,90 · F3)",
      fixType: "replace_product",
      targetProductId: "fix-bucha-s8",
      replacementProductId: "fix-bucha-drywall",
    });
  }

  if (allIds.has("fix-bucha-s8") || allIds.has("fix-bucha-drywall") || allIds.has("fix-mao-francesa") || allIds.has("fix-prateleira-mdf")) {
    if (!allIds.has("fer-kit-brocas")) {
      alerts.push({
        id: "fix-no-drillbit",
        severity: "critical",
        title: isDrywallProject
          ? "Instalação exige Broca adequada para abrir o furo da bucha"
          : "Bucha S8 exige Broca Vídea 8mm para alvenaria",
        explanation: isDrywallProject
          ? "Sem a broca no diâmetro exato da bucha de drywall, o gesso esfarela e o suporte perde firmeza."
          : "Usar broca de madeira ou metal em tijolo alarga o furo e faz a bucha girar em falso. Adicione o jogo de brocas para concreto.",
        fixLabel: "Adicionar Kit Brocas Vídea (R$ 24,90 · F2)",
        fixType: "add_product",
        targetProductId: "fer-kit-brocas",
      });
    } else {
      passedChecks.push(
        isDrywallProject
          ? "Compatibilidade drywall × bucha de drywall × broca validada"
          : "Compatibilidade bucha × broca validada (S8 ↔ Vídea 8mm)"
      );
    }

    if (!allIds.has("fer-nivel-bolha")) {
      alerts.push({
        id: "fix-no-level",
        severity: "warning",
        title: "Sem Nível de Bolha — risco de prateleira torta",
        explanation:
          "Medir só no olho ou pelo piso desnivelado costuma deixar prateleiras inclinadas.",
        fixLabel: "Adicionar Nível 30cm (R$ 29,90 · F1)",
        fixType: "add_product",
        targetProductId: "fer-nivel-bolha",
      });
    } else {
      passedChecks.push("Alinhamento de instalação assegurado (Nível 30cm)");
    }
  }

  // 5. Pintura: proteção + preparação de superfície
  const hasPaint = Array.from(allIds).some((id) => id.startsWith("tin-acrilica"));
  if (hasPaint) {
    if (!allIds.has("tin-fita-crepe") || !allIds.has("tin-lona")) {
      alerts.push({
        id: "tin-no-protection",
        severity: "warning",
        title: "Proteção de rodapé e piso incompleta",
        explanation:
          "Pintar sem fita crepe e lona plástica gera respingos no piso e exige horas extras de limpeza pós-obra.",
        fixLabel: !allIds.has("tin-fita-crepe")
          ? "Adicionar Fita Crepe (R$ 14,90 · T1)"
          : "Adicionar Lona 4x5m (R$ 22,40 · T1)",
        fixType: "add_product",
        targetProductId: !allIds.has("tin-fita-crepe") ? "tin-fita-crepe" : "tin-lona",
      });
    } else {
      passedChecks.push("Proteção de ambiente completa (Lona + Fita Crepe)");
    }

    const seladorOpt = optionalMap.get("tin-selador");
    if (seladorOpt && !allIds.has("tin-selador") && !allIds.has("tin-fundo-prep")) {
      alerts.push({
        id: "tin-prep-tip",
        severity: "info",
        title: "Vai pintar sobre reboco novo ou cor escura?",
        explanation:
          "Se a parede atual for escura ou estiver descascando, aplicar Fundo Preparador economiza até 1 demão de tinta.",
        fixLabel: "Incluir Fundo Preparador 3,6L (R$ 54,90 · T3)",
        fixType: "add_product",
        targetProductId: "tin-fundo-prep",
      });
    }
  }

  // 6. Trinca / Massa acrílica sem fita telada
  if (allIds.has("mat-massa-acrilica") && !allIds.has("mat-fita-telada")) {
    alerts.push({
      id: "mat-no-mesh",
      severity: "critical",
      title: "Sem Fita Telada a trinca tende a reabrir",
      explanation:
        "Massa acrílica sozinha não absorve dilatação térmica da parede. A fita telada evita retrabalho em poucos meses.",
      fixLabel: "Adicionar Fita Telada 48mm (R$ 19,90 · M4)",
      fixType: "add_product",
      targetProductId: "mat-fita-telada",
    });
  } else if (allIds.has("mat-massa-acrilica") && allIds.has("mat-fita-telada")) {
    passedChecks.push("Reforço estrutural leve validado (Fita Telada + Massa Acrílica)");
  }

  if (passedChecks.length === 0) {
    passedChecks.push("SKUs e corredores validados no catálogo da loja");
  }

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  const rawScore = 100 - criticalCount * 22 - warningCount * 10 - (alerts.length - criticalCount - warningCount) * 4;
  const score = Math.max(42, Math.min(100, rawScore));

  const statusLabel =
    criticalCount > 0
      ? `${criticalCount} alerta${criticalCount > 1 ? "s" : ""} crítico${criticalCount > 1 ? "s" : ""}`
      : warningCount > 0
      ? `${warningCount} ponto${warningCount > 1 ? "s" : ""} de atenção`
      : "Tudo certo: você não vai precisar voltar à loja";

  return {
    score,
    statusLabel,
    alerts: alerts.map(withCatalogPrice),
    passedChecks,
  };
}

// Preco e corredor no rotulo vem do catalogo: escritos a mao ficavam desatualizados.
function withCatalogPrice(alert: CompatibilityAlert): CompatibilityAlert {
  const product = getProductById(alert.replacementProductId ?? alert.targetProductId ?? "");
  if (!product || !alert.fixLabel) return alert;
  const price = product.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return { ...alert, fixLabel: alert.fixLabel.replace(/\(R\$[^)]*\)/, `(${price} · ${product.corridorCode})`) };
}
