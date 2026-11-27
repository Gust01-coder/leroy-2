export type Department =
  | "Hidráulica"
  | "Tintas"
  | "Ferramentas"
  | "Fixação"
  | "Elétrica"
  | "Materiais Básicos"
  | "Limpeza";

export type StoreSpecialist = {
  id: string;
  name: string;
  role: string;
  department: Department;
  aisle: string;
  etaMinutes: number;
};

export type StoreInfo = {
  id: string;
  name: string;
  shortName: string;
  address: string;
  neighborhood: string;
  city: string;
  areaM2: number;
  parkingSpots: number;
  activeCarts: number;
  services: string[];
  specialists: StoreSpecialist[];
};

export type Product = {
  id: string;
  sku: string;
  brand: string;
  leroyExclusive?: boolean;
  name: string;
  imageUrl: string;
  category: Department;
  price: number;
  unit: string;
  aisle: string;
  corridorCode: string;
  shelfLocation: string;
  description: string;
  laymanTerms: string[];
  tags: string[];
  stockByStore: Record<string, number>;
  substituteId?: string;
};

export type ProjectItem = {
  productId: string;
  name: string;
  brand: string;
  leroyExclusive?: boolean;
  imageUrl: string;
  sku: string;
  category: Department;
  price: number;
  unit: string;
  quantity: number;
  aisle: string;
  corridorCode: string;
  shelfLocation: string;
  stockQty: number;
  inStock: boolean;
  optional?: boolean;
  reason?: string;
  substituteId?: string;
  substituteName?: string;
  substitutePrice?: number;
  substituteAisle?: string;
  substituteShelf?: string;
  substituteStockQty?: number;
};

export type TutorialStep = {
  step: number;
  title: string;
  detail: string;
  durationMin: number;
  tip?: string;
  safetyWarning?: string;
};

export type BudgetTierId = "economico" | "recomendado" | "profissional";

export type InstallServiceOption = {
  code: string;
  title: string;
  description: string;
  price: number;
  warrantyMonths: number;
  estimatedDuration: string;
  includes: string[];
};

export type DynamicProjectList = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  storeId: string;
  difficulty: "Fácil" | "Moderado" | "Especialista";
  estimatedInstallMin: number;
  sourceIntent: string;
  activeTier?: BudgetTierId;
  calculationNote?: string;
  items: ProjectItem[];
  tutorial: TutorialStep[];
  createdAt: number;
};

export type CompatibilityAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  explanation: string;
  fixLabel?: string;
  fixType?: "add_product" | "replace_product" | "include_optional";
  targetProductId?: string;
  replacementProductId?: string;
};

export type CompatibilityAudit = {
  score: number;
  statusLabel: string;
  alerts: CompatibilityAlert[];
  passedChecks: string[];
};

export type SemanticSearchMatch = {
  product: Product;
  score: number;
  matchedTerms: string[];
  stockQty: number;
  inStock: boolean;
};

export type VisionSampleId =
  | "torneira-vazando"
  | "sifao-pia"
  | "trinca-parede"
  | "resistencia-chuveiro";

export type VisionAnalysisResult = {
  id: string;
  sampleId?: VisionSampleId;
  detectedItem: string;
  confidence: number;
  category: Department;
  technicalTranslation: string;
  diagnosis: string;
  recommendedAction: string;
  suggestedPrompt: string;
  project?: DynamicProjectList;
  matchedProductIds: string[];
  imagePreview?: string;
  requiresSpecialist?: boolean;
};

export type HandoffTicketStatus =
  | "aguardando"
  | "a_caminho"
  | "em_atendimento"
  | "resolvido";

export type HandoffTicket = {
  id: string;
  storeId: string;
  customerPain: string;
  category: Department;
  complexity: "Alta" | "Média";
  specialistName: string;
  specialistRole: string;
  aisle: string;
  etaMinutes: number;
  status: HandoffTicketStatus;
  summary: string;
  highlights: string[];
  createdAt: number;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  suggestions?: string[];
  actionProject?: DynamicProjectList;
  visionResult?: VisionAnalysisResult;
  handoffTicket?: HandoffTicket;
  semanticMatches?: SemanticSearchMatch[];
  userImagePreview?: string;
  viaVoice?: boolean;
  timestamp: number;
};

export type ChatContext = {
  step: string;
  intent?:
    | "torneira"
    | "pintura"
    | "trinca"
    | "prateleira"
    | "eletrica"
    | "iluminacao"
    | null;
  storeId: string;
  details: Record<string, string>;
  history: string[];
};

export type Aisle = {
  id: string;
  corridorNumber?: string;
  label: string;
  shortLabel: string;
  department: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accessX: number;
  accessY: number;
};

export type RoutePoint = {
  x: number;
  y: number;
};

export const ANALYTICS_EVENT_TYPES = [
  "session_start",
  "chat_message",
  "voice_command",
  "semantic_search",
  "vision_scan",
  "list_generated",
  "item_checked",
  "item_substituted",
  "compatibility_fixed",
  "tier_switched",
  "install_service_added",
  "esl_blink_triggered",
  "navigation_started",
  "navigation_completed",
  "checkout_completed",
  "handoff_requested",
  "tutorial_viewed",
  "store_changed",
] as const;

export type AnalyticsEventType = (typeof ANALYTICS_EVENT_TYPES)[number];

export type AnalyticsEvent = {
  id: string;
  type: AnalyticsEventType;
  storeId: string;
  timestamp: number;
  label: string;
  aisle?: string;
  painTopic?: string;
  productName?: string;
  durationSec?: number;
  /** Agrupa eventos da mesma visita (sessionStorage do aparelho). */
  sessionId?: string;
  /** Quem respondeu no chat: modelo Gemini ou "local". */
  engine?: string;
  /** O que o cliente pediu e a loja nao tinha. */
  unmet?: string;
};
