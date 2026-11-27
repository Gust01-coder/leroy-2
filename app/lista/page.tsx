"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StoreBar } from "@/components/StoreBar";
import { EslShelfModal } from "@/components/EslShelfModal";
import { AuditPanel } from "@/components/lista/AuditPanel";
import { ListItemCard } from "@/components/lista/ListItemCard";
import { InstallServiceCard } from "@/components/lista/InstallServiceCard";
import { TutorialSteps } from "@/components/lista/TutorialSteps";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  MapIcon,
} from "@/components/Icons";
import { getProductById } from "@/lib/catalog/catalog";
import { formatBRL } from "@/lib/format";
import { auditProjectCompatibility } from "@/lib/catalog/compatibilityEngine";
import { equivalentQuantity, getPresetProject, materializeProjectItems } from "@/lib/catalog/projects";
import { getStoreById } from "@/lib/store/stores";
import { corridorOf, optimizeAisleOrder } from "@/lib/store/storeMap";
import {
  getDynamicProject,
  getSelectedStoreId,
  saveDynamicProject,
  trackEvent,
} from "@/lib/telemetry";
import {
  getInstallServiceForIntent,
  getTiersForIntent,
  materializeTierItems,
} from "@/lib/catalog/tiersAndServices";
import {
  BudgetTierId,
  CompatibilityAlert,
  DynamicProjectList,
  ProjectItem,
} from "@/lib/types";

// Rematerializa pelo catalogo: preco, corredor e substituto sempre da loja atual.
function syncItemsWithStore(items: ProjectItem[], storeId: string): ProjectItem[] {
  return items.map(
    (item) =>
      materializeProjectItems(
        [{ productId: item.productId, quantity: item.quantity, optional: item.optional, reason: item.reason }],
        storeId
      )[0] ?? item
  );
}

export default function ListaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-floor" />}>
      <ListaInner />
    </Suspense>
  );
}

function ListaInner() {
  const params = useSearchParams();
  const projectId = params.get("id") ?? "";
  const initialTab = params.get("tab") === "tutorial" ? "tutorial" : "itens";

  const [storeId, setStoreId] = useState("es-vitoria");
  const [project, setProject] = useState<DynamicProjectList | null>(null);
  const [activeTab, setActiveTab] = useState<"itens" | "tutorial">(initialTab);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [includedOptionals, setIncludedOptionals] = useState<Record<string, boolean>>({});
  const [doneSteps, setDoneSteps] = useState<Record<number, boolean>>({});
  const [includeInstall, setIncludeInstall] = useState(false);
  const [eslItem, setEslItem] = useState<ProjectItem | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const currentStore = getSelectedStoreId();
    setStoreId(currentStore);

    const loadProject = (stId: string) => {
      const base = getDynamicProject(projectId) ?? getPresetProject(projectId, stId);
      // Id desconhecido: avisar em vez de mostrar uma lista de torneira que o cliente nao pediu.
      setMissing(!base);
      if (!base) return;
      const defaultTier: BudgetTierId =
        base.activeTier ??
        (base.id.includes("reparo-torneira") || base.id.includes("troca-resistencia")
          ? "economico"
          : "recomendado");
      const synced: DynamicProjectList = {
        ...base,
        storeId: stId,
        activeTier: defaultTier,
        items: syncItemsWithStore(base.items, stId),
      };
      setProject(synced);
      saveDynamicProject(synced);
    };

    loadProject(currentStore);

    const onStore = (e: Event) => {
      const nextStore = (e as CustomEvent<string>).detail;
      if (nextStore) {
        setStoreId(nextStore);
        loadProject(nextStore);
      }
    };
    window.addEventListener("lm:store-changed", onStore);
    return () => window.removeEventListener("lm:store-changed", onStore);
  }, [projectId]);

  const activeItems = useMemo(() => {
    if (!project) return [];
    return project.items.filter((i) => !i.optional || includedOptionals[i.productId]);
  }, [project, includedOptionals]);

  const audit = useMemo(() => {
    if (!project) return null;
    return auditProjectCompatibility(project, includedOptionals);
  }, [project, includedOptionals]);

  const tiers = useMemo(
    // Projeto calculado por medida (pintura) perderia a quantidade ao trocar para a lista fixa da faixa.
    () => (project && !project.calculationNote ? getTiersForIntent(project.sourceIntent) : []),
    [project]
  );

  const installService = useMemo(
    () => (project ? getInstallServiceForIntent(project.sourceIntent) : undefined),
    [project]
  );

  const materialsTotal = useMemo(
    () => activeItems.reduce((acc, i) => acc + i.price * i.quantity, 0),
    [activeItems]
  );

  const grandTotal = materialsTotal + (includeInstall && installService ? installService.price : 0);

  const uniqueAisles = useMemo(
    () => Array.from(new Set(activeItems.filter((i) => i.inStock).map((i) => i.aisle))),
    [activeItems]
  );

  const checkedCount = useMemo(
    () => activeItems.filter((i) => checkedIds[i.productId]).length,
    [activeItems, checkedIds]
  );

  function persist(next: DynamicProjectList) {
    setProject(next);
    saveDynamicProject(next);
  }

  function updateQty(productId: string, delta: number) {
    if (!project) return;
    persist({
      ...project,
      items: project.items.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      ),
    });
  }

  function removeItem(productId: string) {
    if (!project || project.items.length <= 1) return;
    persist({
      ...project,
      items: project.items.filter((i) => i.productId !== productId),
    });
  }

  function toggleChecked(item: ProjectItem) {
    const nextVal = !checkedIds[item.productId];
    setCheckedIds((prev) => ({ ...prev, [item.productId]: nextVal }));
    if (nextVal) {
      trackEvent({
        type: "item_checked",
        storeId,
        label: `Item no carrinho: ${item.name}`,
        aisle: item.aisle,
        productName: item.name,
      });
    }
  }

  function applySubstitution(item: ProjectItem, replacementId?: string) {
    if (!project) return;
    const subId = replacementId || item.substituteId;
    if (!subId) return;
    const subProd = getProductById(subId);
    if (!subProd) return;
    const [replacement] = materializeProjectItems(
      [
        {
          productId: subProd.id,
          quantity: equivalentQuantity(item.quantity, item.unit, subProd.unit),
          optional: item.optional,
          reason: "Substituto em estoque",
        },
      ],
      storeId
    );

    persist({
      ...project,
      items: project.items.map((it) => (it.productId === item.productId ? replacement : it)),
    });

    trackEvent({
      type: "item_substituted",
      storeId,
      label: `Ruptura contornada: ${item.name} → ${subProd.name}`,
      aisle: subProd.aisle,
      productName: item.name,
    });
  }

  function applyAuditFix(alert: CompatibilityAlert) {
    if (!project || !alert.fixType || !alert.targetProductId) return;

    if (alert.fixType === "replace_product" && alert.replacementProductId) {
      const existing = project.items.find((i) => i.productId === alert.targetProductId);
      if (existing) {
        applySubstitution(existing, alert.replacementProductId);
        trackEvent({
          type: "compatibility_fixed",
          storeId,
          label: `Auditoria corrigida: ${alert.title}`,
          aisle: existing.aisle,
          painTopic: project.sourceIntent,
        });
      }
      return;
    }

    if (alert.fixType === "add_product") {
      const alreadyIn = project.items.find((i) => i.productId === alert.targetProductId);
      if (alreadyIn) {
        setIncludedOptionals((prev) => ({ ...prev, [alreadyIn.productId]: true }));
        persist({
          ...project,
          items: project.items.map((i) =>
            i.productId === alreadyIn.productId ? { ...i, optional: false } : i
          ),
        });
      } else {
        const added = materializeProjectItems(
          [{ productId: alert.targetProductId, quantity: 1, reason: "Adicionado pela auditoria" }],
          storeId
        );
        if (added.length > 0) {
          persist({
            ...project,
            items: [...project.items, added[0]],
          });
        }
      }

      const prod = getProductById(alert.targetProductId);
      trackEvent({
        type: "compatibility_fixed",
        storeId,
        label: `2ª viagem evitada: ${prod?.name ?? alert.targetProductId} adicionado`,
        aisle: prod?.aisle,
        painTopic: project.sourceIntent,
      });
    }
  }

  function switchTier(tierId: BudgetTierId) {
    if (!project) return;
    const isDrywall =
      project.id.includes("drywall") ||
      project.title.toLowerCase().includes("drywall");
    const tierItems = materializeTierItems(project.sourceIntent, tierId, storeId, {
      isDrywall,
    });
    if (!tierItems) return;

    persist({
      ...project,
      activeTier: tierId,
      items: tierItems,
    });
    setCheckedIds({});
    trackEvent({
      type: "tier_switched",
      storeId,
      label: `Orçamento alterado para "${tierId}" em ${project.title}`,
      aisle: tierItems[0]?.aisle,
      painTopic: project.sourceIntent,
    });
  }

  function toggleInstallService() {
    if (!installService) return;
    const next = !includeInstall;
    setIncludeInstall(next);
    if (next) {
      trackEvent({
        type: "install_service_added",
        storeId,
        label: `Leroy Merlin Instala adicionado: ${installService.title}`,
        aisle: project?.items[0]?.aisle,
        painTopic: project?.sourceIntent,
      });
    }
  }

  function handleOpenTutorial() {
    setActiveTab("tutorial");
    if (project) {
      trackEvent({
        type: "tutorial_viewed",
        storeId,
        label: `Tutorial aberto: ${project.title}`,
        aisle: project.items[0]?.aisle,
        painTopic: project.sourceIntent,
      });
    }
  }

  if (!project || !audit) {
    return (
      <div className="flex min-h-screen flex-col bg-floor">
        <StoreBar />
        {missing ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-[14px] font-semibold text-signage">Não encontrei essa lista neste aparelho.</p>
            <p className="text-[12.5px] text-signage-muted">Ela pode ter sido criada em outro celular. Descreva o projeto de novo que o Copiloto monta em segundos.</p>
            <Link href="/chat" className="btn-accent">Abrir o Copiloto</Link>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13.5px] text-signage-muted">
            Carregando lista…
          </div>
        )}
      </div>
    );
  }

  const activeStore = getStoreById(storeId);
  const activeTierObj = tiers.find((t) => t.id === project.activeTier);
  // Mesma ordem da rota do mapa: a lista vira roteiro de coleta corredor a corredor.
  const routeOrder = optimizeAisleOrder(Array.from(new Set(project.items.map((i) => i.aisle))));
  const itemsByRoute = [...project.items].sort(
    (a, b) => routeOrder.indexOf(a.aisle) - routeOrder.indexOf(b.aisle)
  );
  const progressPct =
    activeItems.length > 0
      ? Math.round((checkedCount / activeItems.length) * 100)
      : 0;

  return (
    <div className="flex min-h-screen flex-col bg-floor">
      <StoreBar />

      {/* Cabeçalho enxuto */}
      <section className="border-b border-rule bg-white">
        <div className="container-wide py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="max-w-[640px]">
              <div className="flex items-center gap-2 text-[12px] font-medium text-signage-subtle">
                <span>{project.difficulty}</span>
                <span>·</span>
                <span>~{project.estimatedInstallMin} min</span>
                <span>·</span>
                <span>{activeStore.shortName}</span>
              </div>

              <h1 className="mt-1 font-display text-[24px] font-extrabold leading-tight text-signage sm:text-[28px]">
                {project.title}
              </h1>

              {project.calculationNote && (
                <div className="mt-2.5 inline-block rounded-lg bg-leroy-soft px-3 py-1.5 text-[12px] font-medium text-leroy-deep">
                  {project.calculationNote}
                </div>
              )}
            </div>

            {/* Totalizador compacto */}
            <div className="w-full rounded-xl bg-signage px-4 py-3.5 text-white sm:w-[250px]">
              <div className="flex items-baseline justify-between">
                <span className="text-[11.5px] text-white/65">Total estimado</span>
                <span className="font-mono text-[11px] text-white/65">
                  {checkedCount}/{activeItems.length} coletados
                </span>
              </div>
              <div className="mt-1 font-mono text-[26px] font-extrabold leading-none tabular-nums text-leroy">
                {formatBRL(grandTotal)}
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-leroy transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container-wide flex-1 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* COLUNA PRINCIPAL (8 cols) */}
          <div className="space-y-4 lg:col-span-8">
            {/* Barra enxuta: Nível de orçamento (segmented control) + Abas */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-lg border border-rule-strong bg-white p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("itens")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    activeTab === "itens"
                      ? "bg-signage text-white"
                      : "text-signage-muted hover:text-signage"
                  }`}
                >
                  <CheckCircleIcon size={14} className={activeTab === "itens" ? "text-leroy" : ""} />
                  Itens ({project.items.length})
                </button>
                <button
                  type="button"
                  onClick={handleOpenTutorial}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    activeTab === "tutorial"
                      ? "bg-signage text-white"
                      : "text-signage-muted hover:text-signage"
                  }`}
                >
                  <BookOpenIcon size={14} className={activeTab === "tutorial" ? "text-leroy" : ""} />
                  Passo a passo ({project.tutorial.length})
                </button>
              </div>

              {tiers.length > 0 && activeTab === "itens" && (
                <div className="inline-flex rounded-lg border border-rule bg-white p-1">
                  {tiers.map((tier) => {
                    const active = project.activeTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => switchTier(tier.id)}
                        aria-pressed={active}
                        className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition ${
                          active
                            ? "bg-leroy text-signage"
                            : "text-signage-muted hover:text-signage"
                        }`}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {activeTierObj && activeTab === "itens" && (
              <p className="text-[12.5px] text-signage-muted">
                <strong className="font-semibold text-signage">
                  Perfil {activeTierObj.label}:
                </strong>{" "}
                {activeTierObj.tagline} ({activeTierObj.durability})
              </p>
            )}

            {/* ABA 1: LISTA DE ITENS (LIMPA E ESCANEÁVEL) */}
            {activeTab === "itens" && (
              <div className="space-y-2.5">
                {itemsByRoute.map((item, idx) => {
                  const isOptionalExcluded =
                    Boolean(item.optional) && !includedOptionals[item.productId];
                  const isChecked = Boolean(checkedIds[item.productId]);
                  const group =
                    idx === 0 || itemsByRoute[idx - 1].aisle !== item.aisle
                      ? itemsByRoute.filter(
                          (i) => i.aisle === item.aisle && (!i.optional || includedOptionals[i.productId])
                        )
                      : null;

                  return (
                    <Fragment key={item.productId}>
                    {group && (
                      <h3 className={`flex items-center gap-2 ${idx > 0 ? "pt-2" : ""}`}>
                        <span className="aisle-plate">Corredor {item.corridorCode ?? corridorOf(item.aisle)}</span>
                        {group.length > 0 && (
                          <span className="text-[12px] font-medium text-signage-muted">
                            {group.filter((i) => checkedIds[i.productId]).length}/{group.length} coletados
                          </span>
                        )}
                      </h3>
                    )}
                    <ListItemCard
                      item={item}
                      isChecked={isChecked}
                      isOptionalExcluded={isOptionalExcluded}
                      canRemove={project.items.length > 1}
                      onToggleChecked={toggleChecked}
                      onRemove={removeItem}
                      onOpenEsl={setEslItem}
                      onChangeQty={updateQty}
                      onSubstitute={applySubstitution}
                      setIncludedOptionals={setIncludedOptionals}
                    />
                    </Fragment>
                  );
                })}
              </div>
            )}

            {/* ABA 2: TUTORIAL PÓS-COMPRA */}
            {activeTab === "tutorial" && (
              <TutorialSteps
                tutorial={project.tutorial}
                doneSteps={doneSteps}
                setDoneSteps={setDoneSteps}
              />
            )}
          </div>

          {/* COLUNA LATERAL (4 cols) — CALMA E DIRETA */}
          <aside className="space-y-4 lg:col-span-4">
            <AuditPanel audit={audit} onApplyFix={applyAuditFix} />

            {/* Leroy Merlin Instala (compacto) */}
            {installService && (
              <InstallServiceCard
                service={installService}
                included={includeInstall}
                onToggle={toggleInstallService}
              />
            )}

            {/* CTAs */}
            <div className="space-y-2.5">
              <Link
                href={`/checkout?id=${encodeURIComponent(project.id)}${
                  includeInstall ? "&install=1" : ""
                }`}
                className="btn-accent w-full"
              >
                Finalizar no Checkout Expresso
                <ArrowRightIcon size={15} />
              </Link>
              <Link
                href={`/mapa?id=${encodeURIComponent(project.id)}`}
                className="btn-primary w-full"
              >
                <MapIcon size={15} />
                Traçar rota ({uniqueAisles.length}{" "}
                {uniqueAisles.length === 1 ? "corredor" : "corredores"})
              </Link>
              <Link href="/chat" className="btn-secondary w-full">
                Voltar ao Copiloto
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <EslShelfModal
        item={eslItem}
        storeId={storeId}
        onClose={() => setEslItem(null)}
      />
    </div>
  );
}
