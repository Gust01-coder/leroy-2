import { Department, StoreInfo, StoreSpecialist } from "../types";

export const STORES: StoreInfo[] = [
  {
    id: "es-vitoria",
    name: "Leroy Merlin Vitória",
    shortName: "Vitória · Jardim Camburi",
    address: "Av. Fernando Ferrari, 2600 · Aeroporto / Próx. Jardim Camburi",
    neighborhood: "Aeroporto / Jardim Camburi",
    city: "Vitória, ES",
    areaM2: 15700,
    parkingSpots: 338,
    activeCarts: 164,
    services: [
      "Fábrica de Cores",
      "Corte de Madeira e Vidro",
      "Mesa de Bricolagem",
      "Leroy Merlin Instala",
      "Clique e Retire",
      "Drive-Thru Construção",
    ],
    specialists: [
      {
        id: "esp-carlos-vix",
        name: "Carlos Eduardo",
        role: "Especialista em Obras & Estrutural",
        department: "Materiais Básicos",
        aisle: "M4",
        etaMinutes: 3,
      },
      {
        id: "esp-marina-vix",
        name: "Marina Tavares",
        role: "Especialista em Banheiros & Hidráulica",
        department: "Hidráulica",
        aisle: "H1",
        etaMinutes: 2,
      },
      {
        id: "esp-roberto-vix",
        name: "Roberto Almeida",
        role: "Técnico em Elétrica & Iluminação",
        department: "Elétrica",
        aisle: "E1",
        etaMinutes: 3,
      },
      {
        id: "esp-juliana-vix",
        name: "Juliana Rocha",
        role: "Consultora da Fábrica de Cores",
        department: "Tintas",
        aisle: "T2",
        etaMinutes: 2,
      },
    ],
  },
  {
    id: "sp-tiete",
    name: "Leroy Merlin Marginal Tietê",
    shortName: "Marginal Tietê · SP",
    address: "Av. Presidente Castelo Branco, 6061 · Água Branca",
    neighborhood: "Água Branca",
    city: "São Paulo, SP",
    areaM2: 12000,
    parkingSpots: 420,
    activeCarts: 148,
    services: [
      "Fábrica de Cores",
      "Corte de Madeira",
      "Leroy Merlin Instala",
      "Clique e Retire",
    ],
    specialists: [
      {
        id: "esp-andre-sp",
        name: "André Nogueira",
        role: "Especialista em Obras & Impermeabilização",
        department: "Materiais Básicos",
        aisle: "M4",
        etaMinutes: 3,
      },
      {
        id: "esp-patricia-sp",
        name: "Patrícia Gomes",
        role: "Consultora de Hidráulica & Banho",
        department: "Hidráulica",
        aisle: "H2",
        etaMinutes: 2,
      },
      {
        id: "esp-diego-sp",
        name: "Diego Fernandes",
        role: "Técnico em Elétrica Residencial",
        department: "Elétrica",
        aisle: "E1",
        etaMinutes: 2,
      },
      {
        id: "esp-camila-sp",
        name: "Camila Duarte",
        role: "Consultora da Fábrica de Cores",
        department: "Tintas",
        aisle: "T2",
        etaMinutes: 2,
      },
    ],
  },
  {
    id: "rj-barra",
    name: "Leroy Merlin Barra da Tijuca",
    shortName: "Barra da Tijuca · RJ",
    address: "Av. Ayrton Senna, 2000 · Barra da Tijuca",
    neighborhood: "Barra da Tijuca",
    city: "Rio de Janeiro, RJ",
    areaM2: 11400,
    parkingSpots: 360,
    activeCarts: 122,
    services: [
      "Fábrica de Cores",
      "Corte de Madeira",
      "Leroy Merlin Instala",
      "Clique e Retire",
    ],
    specialists: [
      {
        id: "esp-rafael-rj",
        name: "Rafael Menezes",
        role: "Especialista em Obras & Alvenaria",
        department: "Materiais Básicos",
        aisle: "M4",
        etaMinutes: 3,
      },
      {
        id: "esp-luana-rj",
        name: "Luana Barros",
        role: "Especialista em Hidráulica",
        department: "Hidráulica",
        aisle: "H3",
        etaMinutes: 2,
      },
      {
        id: "esp-thiago-rj",
        name: "Thiago Costa",
        role: "Técnico em Elétrica & Automação",
        department: "Elétrica",
        aisle: "E1",
        etaMinutes: 3,
      },
      {
        id: "esp-bianca-rj",
        name: "Bianca Castro",
        role: "Consultora de Tintas & Acabamento",
        department: "Tintas",
        aisle: "T2",
        etaMinutes: 2,
      },
    ],
  },
];

export const DEFAULT_STORE_ID = "es-vitoria";

export function getStoreById(storeId?: string): StoreInfo {
  return STORES.find((s) => s.id === storeId) ?? STORES[0];
}

export function getSpecialistForDepartment(
  storeId: string,
  department: Department
): StoreSpecialist {
  const store = getStoreById(storeId);
  return (
    store.specialists.find((s) => s.department === department) ??
    store.specialists[0]
  );
}
