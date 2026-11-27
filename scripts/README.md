# Pipeline de Coleta e Normalização de Catálogo (`catalog_collector.py`)

Script em **Python 3 puro** (sem dependências externas) para alimentar o **LM Copiloto** com dados estruturados e fotos padronizadas em `4:3 (640×480)`.

## Sobre API oficial da Leroy Merlin

- A **Leroy Merlin Brasil / Grupo ADEO não disponibiliza API pública aberta/anônima** para copiar o catálogo de loja.
- Os portais oficiais (`developer.adeo.com`, `developer.leroymerlin.fr` e `portalseller.leroymerlin.com.br`) exigem credencial de parceiro (`ADEO_API_KEY` / `X-Gateway-APIKey`).
- O site `www.leroymerlin.com.br` possui proteção WAF/anti-bot (`HTTP 403` para scripts). Por conformidade técnica e legal, este coletor **não tenta burlar WAF ou CAPTCHA**.

## Como usar

Execute os comandos abaixo no PowerShell dentro da pasta `lm-copiloto`:

### 1. Verificar status das fontes
```powershell
python scripts/catalog_collector.py --mode status
```

### 2. Modo Contínuo — Importar páginas salvas pelo navegador (JSON-LD) ou CSV
Deixe rodando enquanto você salva páginas de produtos no navegador (`Ctrl+S` → salvar em `scripts/input_pages/`) ou adiciona linhas em `scripts/input_pages/exemplo_produtos.csv`:
```powershell
python scripts/catalog_collector.py --mode import-pages --watch --sync-public
```
O script lê automaticamente o bloco estruturado **Schema.org `Product` (`application/ld+json`)** (SKU, marca, nome, preço, descrição e imagem), recorta a foto em `640×480 (4:3)` e salva em `scripts/collected_catalog.json` + `public/products/`.

### 3. Modo Contínuo — Coleta aberta via API oficial Wikimedia Commons
Funciona imediatamente sem chave, com licença aberta e pausa entre chamadas:
```powershell
python scripts/catalog_collector.py --mode wikimedia --limit 15 --delay 2.0
```

### 4. Conector Oficial ADEO / Leroy Merlin Partner API
Caso a equipe receba uma chave sandbox durante a mentoria da Leroy Merlin / FIAP:
```powershell
$env:ADEO_API_KEY = "SUA_CHAVE_AQUI"
python scripts/catalog_collector.py --mode adeo-api --query "torneira" --limit 20
```

### 5. Normalizar proporção das fotos para 4:3 (`640×480`)
Remove bordas brancas excessivas e enquadra as fotos automaticamente:
```powershell
python scripts/catalog_collector.py --mode normalize-images
```

### 6. Exportar para TypeScript (pronto para `lib/catalog/catalog.ts`)
```powershell
python scripts/catalog_collector.py --mode export-ts
```
