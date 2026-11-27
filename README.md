# LM Copiloto v2 · Modo Loja Leroy Merlin (Challenge FIAP 2026 — Sprint 2)

Sistema operacional de loja física (**PWA zero-fricção via QR Code no carrinho**) baseado na unidade real **Leroy Merlin Vitória (Av. Fernando Ferrari, 2600 · próx. Jardim Camburi, ES)** — unindo pesquisa de mercado global (**Home Depot Magic Apron**, **Lowe's Mylow Companion**, **Leroy Merlin Brasil / ADEO** e **ESL Pick-to-Light**) a uma interface limpa, escaneável e de alto contraste.

> **Grupo:** `Tech_01` — 2º Ano · Engenharia de Software (Turma de Fevereiro · FIAP ON)
> - Gustavo Lopes dos Santos — RM 561213
> - Vinícius Neves Teixeira da Costa — RM 562834
> - Gabriel Lincoln Torres Chagas Santos — RM 561776
> - Arlen Gonçalves da Silva — RM 566547
> - Arthur Oliveira Souza — RM 561923

---

## Principais Funcionalidades

1. **Catálogo Real com 63 produtos oficiais e fotos (`/catalogo` e `/`):**
   - Marcas exclusivas Leroy Merlin (`Sensea`, `Dexter`, `Luxens`, `Standers`, `Axton`, `Inspire`, `Spaceo`) e parceiras (`Tigre`, `Blukit`, `Lorenzetti`, `Wago`, `Suvinil`, `3M Scotch`), busca semântica por termos leigos e modal de detalhes com SKU, prateleira e acionamento ESL.
2. **Planta Arquitetônica 2D de Vitória + ESL Pick-to-Light (`/mapa`, `/lista`, `/catalogo`):**
   - Planta 2D com 15 setores, corredores numerados (`C03`–`C24`), navegação ortogonal guiada e planograma da gôndola com etiqueta eletrônica e-ink piscando LED verde no produto exato.
3. **Auditoria Anti-Segunda Viagem + 3 Níveis + *Leroy Merlin Instala* (`/lista`):**
   - Validação automática contra incompatibilidades técnicas e itens críticos esquecidos com correção em 1 clique, alternância ao vivo entre perfis de orçamento e inclusão do serviço certificado **Leroy Merlin Instala** (12 meses de garantia).
4. **Copiloto Multimodal — Voz + Texto + Foto (`/chat`):**
   - Reconhecimento de voz nativo (`Web Speech API` pt-BR), cálculo automático de área/litros e scanner visual de peças quebradas.
5. **Checkout Expresso sem fila (`/checkout`):**
   - Três formas de levar a compra: **sair sem fila** (passe digital de saída com PIN), **Clique & Retire / Drive-Thru** e **entrega expressa**. Pagamento por **Pix (5% OFF)**, cartão ou totem, com opção do serviço **Leroy Merlin Instala**.
   - Ambiente **demonstrativo**: nenhuma cobrança real é feita e o selo do passe digital é ilustrativo (não é um QR Code decodificável).
6. **Console do Vendedor em 3 Abas & Coleta de Dados (`/painel`):**
   - Organizado em **Atendimento** (Fila de Handoff + *Associate Companion*), **Planta & Estoque** (Mapa de Calor 2D + alertas de ruptura) e **Dados & Eventos** (principais dores, telemetria `/api/analytics` e exportação **CSV / JSON**).
7. **Pipeline Python de Catálogo & Imagens (`scripts/catalog_collector.py`):**
   - Importador local de páginas salvas (`Schema.org JSON-LD`) / CSV com `--watch`, conector pronto para a API oficial **ADEO / Leroy Merlin Partner (`ADEO_API_KEY`)**, coletor aberto Wikimedia Commons e normalizador de fotos `4:3 (640×480)`.

---

## Estrutura do projeto

```
app/                 Rotas do Next.js (páginas e API Routes)
  api/               chat, vision, catalog, analytics, handoff
components/          Componentes de UI reutilizáveis
  checkout/          Confirmação do pedido, opções de entrega e pagamento
  lista/             Cartão de item, auditoria, tutorial e serviço Instala
  painel/            Abas e cards do console do vendedor
lib/
  ai/                Motor do copiloto, Gemini, busca semântica e visão
  catalog/           Catálogo (data/ por departamento), projetos, auditoria e níveis de orçamento
  checkout/          Regras de preço, Pix, parcelas e rótulos do checkout
  store/             Unidades, planta 2D e planograma ESL
  server/            Armazenamento de eventos/chamados e rate limit
  format.ts          Formatação de moeda e tempo
  telemetry.ts       Eventos e indicadores do painel
  types.ts           Tipos compartilhados
eval/golden.json     75 casos de referência do chat
scripts/             Coletor Python de catálogo, eval e verificação de segredos
```

---

## Qualidade

| Comando | O que faz |
|---|---|
| `npm run check` | Segredos + typecheck + lint + testes (rode antes de entregar) |
| `npm test` | 27 testes unitários (`lib/**/*.test.ts`) |
| `npm run eval` | Mede o chat contra 75 casos de referência (motor local: **75/75**) |
| `npm run eval -- --llm` | Mesmo eval com o Gemini (exige `GEMINI_API_KEY`) |

O `npm install` ativa o hook `.githooks/pre-commit`, que roda `scripts/check-secrets.mjs` e bloqueia commits com chaves ou credenciais.

---

## Como rodar localmente

```bash
npm install
npm run dev
```

Acesse **http://localhost:3000** (100% funcional sem chaves de API externas).

---

## Deploy na Vercel (com chave segura)

1. Importe o repositório em [vercel.com/new](https://vercel.com/new) (a Vercel detecta **Next.js 14** automaticamente na raiz).
2. Em **Settings → Environment Variables**, adicione:
   - `GEMINI_API_KEY`: sua chave do Google AI Studio (opcional — sem ela o app usa o motor local automaticamente).
   - `DATABASE_URL`: opcional — crie em **Storage → Neon** para persistir eventos e chamados no Postgres entre aparelhos.
3. Clique em **Deploy**.

> **Segurança:** `.env` e `.env.*` (exceto `.env.example`) são ignorados pelo `.gitignore`, e `npm run check` + o hook `pre-commit` (`.githooks/`, ativado pelo `npm install`) rodam `scripts/check-secrets.mjs` para bloquear qualquer commit com chaves API ou credenciais.

---

## Roteiro rápido de demonstração (Vídeo Pitch ≤ 3 min)

1. **Modo Loja (`/`):** Entrada zero-fricção via QR Code no carrinho e busca multimodal (voz, texto ou foto) na unidade **Leroy Merlin Vitória**.
2. **Catálogo & Chat (`/catalogo`, `/chat`):** Busca por termos leigos, abertura do modal de detalhes + **ESL**, scanner visual por foto e cálculo automático de pintura.
3. **Lista Inteligente (`/lista`):** Alternância de perfil de orçamento, disparo ao vivo da **Auditoria Anti-Segunda Viagem**, serviço **Leroy Merlin Instala** e **Tutorial Pós-Compra**.
4. **Planta 2D & Último Metro (`/mapa`):** Rota ortogonal pelos corredores da loja e acionamento do LED piscante (**ESL Pick-to-Light**) na prateleira.
5. **Checkout Expresso (`/checkout`):** Pix com 5% OFF, passe digital de saída sem fila e serviço Leroy Merlin Instala.
6. **Console do Vendedor (`/painel`):** Fila de **Handoff Humano**, **Busca Companion**, **Mapa de Calor 2D** e exportação **CSV / JSON**.
