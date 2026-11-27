#!/usr/bin/env python3
"""
LM Copiloto — Coletor, Importador e Normalizador de Catálogo (Python 3 stdlib)
==============================================================================

Sobre API oficial da Leroy Merlin:
- A Leroy Merlin Brasil / Grupo ADEO NÃO disponibiliza API pública anônima.
- Portais oficiais (developer.adeo.com, developer.leroymerlin.fr e Portal Seller/Mirakl)
  exigem chave de parceiro (ADEO_API_KEY / X-Gateway-APIKey).
- O site www.leroymerlin.com.br usa proteção WAF/anti-bot (HTTP 403 para scripts).
  Este coletor respeita integralmente essas barreiras e NÃO tenta burlar WAF/CAPTCHA.

Modos suportados (100% lícitos e sem dependências externas):
  1. import-pages      : Extrai dados reais (Schema.org JSON-LD Product: nome, marca, SKU,
                         preço, descrição, foto) de páginas HTML salvas localmente pelo
                         usuário via navegador (Ctrl+S em scripts/input_pages/) ou CSV/JSON.
                         Suporta --watch para ficar rodando continuamente!
  2. wikimedia         : Coleta contínua de fotos reais em licença aberta via API pública
                         oficial da Wikimedia Commons (rate-limited, com atribuição).
  3. adeo-api          : Conector pronto para a API oficial ADEO / Leroy Merlin Partner
                         quando a equipe tiver a variável de ambiente ADEO_API_KEY.
  4. normalize-images  : Remove bordas brancas excessivas e padroniza fotos de produtos
                         para proporção 4:3 (640x480) uniforme usando Windows System.Drawing.
  5. export-ts         : Converte scripts/collected_catalog.json em snippet TypeScript
                         pronto para integrar em lib/catalog/catalog.ts.

Exemplos de uso (PowerShell na pasta lm-copiloto):
  python scripts/catalog_collector.py --mode status
  python scripts/catalog_collector.py --mode import-pages --watch
  python scripts/catalog_collector.py --mode wikimedia --limit 15 --delay 2.0
  python scripts/catalog_collector.py --mode adeo-api --query "torneira"
  python scripts/catalog_collector.py --mode normalize-images
  python scripts/catalog_collector.py --mode export-ts
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = ROOT_DIR / "scripts"
INPUT_PAGES_DIR = SCRIPTS_DIR / "input_pages"
COLLECTED_IMAGES_DIR = SCRIPTS_DIR / "collected_images"
PUBLIC_PRODUCTS_DIR = ROOT_DIR / "public" / "products"
OUTPUT_JSON_PATH = SCRIPTS_DIR / "collected_catalog.json"
OUTPUT_TS_PATH = SCRIPTS_DIR / "collected_catalog_export.ts"

USER_AGENT = "LMCopilotoCatalogCollector/2.0 (FIAP Academic Challenge; Contact: tech01-fiap)"

# Fila padrão para coleta aberta na Wikimedia Commons (materiais de construção / bricolagem)
DEFAULT_WIKIMEDIA_QUEUE = [
    ("Hidráulica", "chrome bathroom faucet mixer", "C03", "H1"),
    ("Hidráulica", "pvc pipe plumbing fittings", "C04", "H2"),
    ("Hidráulica", "ptfe thread seal tape", "C05", "H3"),
    ("Hidráulica", "sink trap siphon plumbing", "C04", "H2"),
    ("Tintas", "paint roller tray wall painting", "C09", "T1"),
    ("Tintas", "paint brush bristle wood handle", "C10", "T2"),
    ("Tintas", "masking tape roll painting", "C10", "T2"),
    ("Tintas", "sandpaper abrasive sheets", "C10", "T2"),
    ("Ferramentas", "cordless drill driver tool", "C15", "F1"),
    ("Ferramentas", "adjustable spanner wrench tool", "C15", "F1"),
    ("Ferramentas", "spirit bubble level tool", "C15", "F1"),
    ("Ferramentas", "drill bit set metal masonry", "C15", "F1"),
    ("Fixação", "wall plug anchor screw", "C16", "F3"),
    ("Fixação", "shelf bracket metal wall", "C16", "F3"),
    ("Elétrica", "wago lever wire connector", "C19", "E1"),
    ("Elétrica", "electrical insulation tape rolls", "C19", "E1"),
    ("Elétrica", "led light bulb e27", "C20", "E2"),
    ("Elétrica", "circuit breaker din rail", "C19", "E1"),
    ("Materiais Básicos", "putty knife scraper tool", "C24", "M4"),
    ("Materiais Básicos", "drywall joint compound wall", "C24", "M4"),
]


def slugify(text: str) -> str:
    text = text.lower().strip()
    replacements = {
        "á": "a", "à": "a", "ã": "a", "â": "a",
        "é": "e", "ê": "e", "í": "i",
        "ó": "o", "ô": "o", "õ": "o", "ú": "u", "ç": "c",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:48] or hashlib.md5(text.encode()).hexdigest()[:10]


def load_catalog_db() -> Dict[str, Dict[str, Any]]:
    if OUTPUT_JSON_PATH.exists():
        try:
            data = json.loads(OUTPUT_JSON_PATH.read_text(encoding="utf-8"))
            if isinstance(data, list):
                return {str(item["id"]): item for item in data if "id" in item}
        except Exception as exc:
            print(f"[AVISO] Não foi possível ler {OUTPUT_JSON_PATH}: {exc}")
    return {}


def save_catalog_db(db: Dict[str, Dict[str, Any]]) -> None:
    OUTPUT_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    items = sorted(db.values(), key=lambda x: (x.get("category", ""), x.get("name", "")))
    OUTPUT_JSON_PATH.write_text(
        json.dumps(items, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def http_get_json(url: str, headers: Optional[Dict[str, str]] = None, timeout: int = 12) -> Any:
    req_headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8", errors="replace"))


def download_image(url: str, dest_path: Path, timeout: int = 15) -> bool:
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            ctype = resp.headers.get("Content-Type", "")
            if "image" not in ctype and not url.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
                return False
            data = resp.read()
            if len(data) < 2048:
                return False
            dest_path.write_bytes(data)
            return True
    except Exception as exc:
        print(f"  [erro download imagem] {url}: {exc}")
        return False


def normalize_image_4x3(src_path: Path, dst_path: Path, width: int = 640, height: int = 480) -> bool:
    """
    Remove bordas brancas excessivas e converte a foto para 640x480 (4:3) nítido
    usando .NET System.Drawing (nativo no Windows, sem precisar de Pillow).
    """
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    src_str = str(src_path.resolve()).replace("'", "''")
    dst_str = str(dst_path.resolve()).replace("'", "''")

    ps_script = f"""
Add-Type -AssemblyName System.Drawing
$srcPath = '{src_str}'
$dstPath = '{dst_str}'
$tw = {width}; $th = {height}

$rawBytes = [System.IO.File]::ReadAllBytes($srcPath)
$ms = New-Object System.IO.MemoryStream(,$rawBytes)
$orig = [System.Drawing.Bitmap]::FromStream($ms)

# 1. Detecta bounding box de conteúdo (ignora bordas quase brancas RGB > 246)
$w = $orig.Width; $h = $orig.Height
$minX = $w; $minY = $h; $maxX = 0; $maxY = 0
$step = [Math]::Max(1, [Math]::Floor([Math]::Min($w, $h) / 180))
for ($y = 0; $y -lt $h; $y += $step) {{
  for ($x = 0; $x -lt $w; $x += $step) {{
    $c = $orig.GetPixel($x, $y)
    if ($c.A -gt 20 -and ($c.R -lt 246 -or $c.G -lt 246 -or $c.B -lt 246)) {{
      if ($x -lt $minX) {{ $minX = $x }}
      if ($x -gt $maxX) {{ $maxX = $x }}
      if ($y -lt $minY) {{ $minY = $y }}
      if ($y -gt $maxY) {{ $maxY = $y }}
    }}
  }}
}}

if ($maxX -le $minX -or $maxY -le $minY) {{
  $minX = 0; $minY = 0; $maxX = $w - 1; $maxY = $h - 1
}}
$cw = $maxX - $minX + 1
$ch = $maxY - $minY + 1

# Checa se a imagem recortada já tem fundo branco puro nos cantos (foto de estúdio isolada)
$c1 = $orig.GetPixel($minX, $minY)
$c2 = $orig.GetPixel([Math]::Min($w-1, $maxX), $minY)
$c3 = $orig.GetPixel($minX, [Math]::Min($h-1, $maxY))
$c4 = $orig.GetPixel([Math]::Min($w-1, $maxX), [Math]::Min($h-1, $maxY))
$whiteCorners = 0
foreach ($cc in @($c1, $c2, $c3, $c4)) {{
  if ($cc.R -ge 242 -and $cc.G -ge 242 -and $cc.B -ge 242) {{ $whiteCorners++ }}
}}

$out = New-Object System.Drawing.Bitmap($tw, $th)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$aspectContent = [double]$cw / [double]$ch
$aspectTarget = [double]$tw / [double]$th

if ($whiteCorners -ge 3 -and ($aspectContent -gt 2.4 -or $aspectContent -lt 0.45)) {{
  # Objeto isolado muito fino (ex: chave de fenda): rotaciona -26 graus em estúdio claro
  $g.Clear([System.Drawing.Color]::FromArgb(245, 246, 248))
  $cropBmp = New-Object System.Drawing.Bitmap($cw, $ch)
  $gc = [System.Drawing.Graphics]::FromImage($cropBmp)
  $gc.DrawImage($orig, (New-Object System.Drawing.Rectangle(0, 0, $cw, $ch)), (New-Object System.Drawing.Rectangle($minX, $minY, $cw, $ch)), [System.Drawing.GraphicsUnit]::Pixel)
  $gc.Dispose()
  $scale = [Math]::Min(($tw * 0.88) / $cw, ($th * 0.72) / $ch)
  $dw = [int]($cw * $scale); $dh = [int]($ch * $scale)
  $g.TranslateTransform($tw / 2.0, $th / 2.0)
  $g.RotateTransform(-26)
  $g.DrawImage($cropBmp, -$dw / 2.0, -$dh / 2.0, $dw, $dh)
  $cropBmp.Dispose()
}} elseif ($whiteCorners -ge 3) {{
  # Produto recortado em fundo branco: enquadramento generoso (86%) sobre fundo neutro
  $g.Clear([System.Drawing.Color]::FromArgb(248, 249, 251))
  $scale = [Math]::Min(($tw * 0.86) / $cw, ($th * 0.86) / $ch)
  $dw = [int]($cw * $scale); $dh = [int]($ch * $scale)
  $dx = [int](($tw - $dw) / 2); $dy = [int](($th - $dh) / 2)
  $g.DrawImage($orig, (New-Object System.Drawing.Rectangle($dx, $dy, $dw, $dh)), (New-Object System.Drawing.Rectangle($minX, $minY, $cw, $ch)), [System.Drawing.GraphicsUnit]::Pixel)
}} else {{
  # Fotografia real com ambiente: cover full-bleed 4:3 sem faixas brancas!
  $g.Clear([System.Drawing.Color]::White)
  if ($aspectContent -gt $aspectTarget) {{
    $srcH = $ch
    $srcW = [int]($ch * $aspectTarget)
    $srcX = $minX + [int](($cw - $srcW) / 2)
    $srcY = $minY
  }} else {{
    $srcW = $cw
    $srcH = [int]($cw / $aspectTarget)
    $srcX = $minX
    $srcY = $minY + [int](($ch - $srcH) / 2)
  }}
  $g.DrawImage($orig, (New-Object System.Drawing.Rectangle(0, 0, $tw, $th)), (New-Object System.Drawing.Rectangle($srcX, $srcY, $srcW, $srcH)), [System.Drawing.GraphicsUnit]::Pixel)
}}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object {{ $_.MimeType -eq 'image/jpeg' }}
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]88)
$out.Save($dstPath, $jpegCodec, $encParams)

$g.Dispose(); $out.Dispose(); $orig.Dispose(); $ms.Dispose()
Write-Output "OK"
"""
    res = subprocess.run(
        ["powershell", "-NoProfile", "-Command", ps_script],
        capture_output=True,
        text=True,
    )
    if res.returncode != 0 or "OK" not in res.stdout:
        print(f"  [erro normalize] {src_path.name}: {res.stderr.strip()}")
        return False
    return True


# ---------------------------------------------------------------------------
# MODO 1: STATUS / DIAGNÓSTICO DE APIs
# ---------------------------------------------------------------------------
def cmd_status() -> None:
    print("=" * 70)
    print("LM COPILOTO — STATUS DE FONTES DE CATÁLOGO")
    print("=" * 70)
    adeo_key = os.environ.get("ADEO_API_KEY", "").strip()
    print(f"1) API Oficial ADEO / Leroy Merlin Partner:")
    print(f"   Status : {'CONFIGURADA (ADEO_API_KEY presente)' if adeo_key else 'NÃO CONFIGURADA (requer chave de parceiro em developer.adeo.com)'}")
    print(f"2) Importador Local de Páginas Salvas (HTML JSON-LD / CSV / JSON):")
    INPUT_PAGES_DIR.mkdir(parents=True, exist_ok=True)
    saved_files = list(INPUT_PAGES_DIR.glob("*.*"))
    print(f"   Pasta  : {INPUT_PAGES_DIR}")
    print(f"   Arquivos aguardando importação: {len(saved_files)}")
    print(f"3) API Aberta Wikimedia Commons (fotos em licença livre):")
    try:
        data = http_get_json(
            "https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json"
        )
        site = data.get("query", {}).get("general", {}).get("sitename", "Wikimedia")
        print(f"   Status : ONLINE ({site} — HTTP 200)")
    except Exception as exc:
        print(f"   Status : OFFLINE ({exc})")

    db = load_catalog_db()
    prod_imgs = list(PUBLIC_PRODUCTS_DIR.glob("*.jpg")) if PUBLIC_PRODUCTS_DIR.exists() else []
    print("-" * 70)
    print(f"Produtos coletados em collected_catalog.json : {len(db)}")
    print(f"Fotos ativas no app (public/products/*.jpg)  : {len(prod_imgs)}")
    print("=" * 70)


# ---------------------------------------------------------------------------
# MODO 2: IMPORTADOR DE PÁGINAS SALVAS PELO USUÁRIO (HTML JSON-LD / CSV / JSON)
# ---------------------------------------------------------------------------
def extract_jsonld_products(html_text: str) -> List[Dict[str, Any]]:
    products: List[Dict[str, Any]] = []
    pattern = re.compile(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        re.IGNORECASE | re.DOTALL,
    )
    for match in pattern.finditer(html_text):
        raw = html.unescape(match.group(1)).strip()
        try:
            payload = json.loads(raw)
        except Exception:
            continue

        candidates: List[Any] = []
        if isinstance(payload, list):
            candidates.extend(payload)
        elif isinstance(payload, dict):
            if "@graph" in payload and isinstance(payload["@graph"], list):
                candidates.extend(payload["@graph"])
            else:
                candidates.append(payload)

        for obj in candidates:
            if not isinstance(obj, dict):
                continue
            obj_type = obj.get("@type", "")
            if obj_type == "Product" or (isinstance(obj_type, list) and "Product" in obj_type):
                products.append(obj)
    return products


def parse_price(val: Any) -> float:
    if isinstance(val, (int, float)):
        return round(float(val), 2)
    if isinstance(val, str):
        cleaned = re.sub(r"[^\d,\.]", "", val)
        if "," in cleaned and "." in cleaned:
            cleaned = cleaned.replace(".", "").replace(",", ".")
        elif "," in cleaned:
            cleaned = cleaned.replace(",", ".")
        try:
            return round(float(cleaned), 2)
        except ValueError:
            return 0.0
    return 0.0


def infer_category_and_corridor(name: str, category_hint: str = "") -> tuple[str, str, str]:
    blob = f"{name} {category_hint}".lower()
    rules = [
        (["torneira", "sifao", "sifão", "veda", "hidraul", "cano", "engate", "reparo", "silicone"], ("Hidráulica", "C05", "H3")),
        (["tinta", "rolo", "pincel", "trincha", "fita crepe", "lixa", "selador", "lona"], ("Tintas", "C09", "T2")),
        (["furadeira", "parafusadeira", "chave", "broca", "nivel", "nível", "martelo", "alicate"], ("Ferramentas", "C15", "F1")),
        (["bucha", "parafuso", "prateleira", "mao francesa", "mão francesa", "suporte"], ("Fixação", "C16", "F3")),
        (["chuveiro", "ducha", "wago", "isolante", "lampada", "lâmpada", "led", "tomada", "disjuntor", "resistencia"], ("Elétrica", "C19", "E1")),
        (["massa", "espatula", "espátula", "impermeabilizante", "cimento", "argamassa", "telada"], ("Materiais Básicos", "C24", "M4")),
        (["pano", "mofo", "limpeza", "detergente", "microfibra"], ("Limpeza", "C22", "L1")),
    ]
    for keywords, target in rules:
        if any(k in blob for k in keywords):
            return target
    return ("Materiais Básicos", "C24", "M4")


def ingest_html_file(file_path: Path, db: Dict[str, Dict[str, Any]], sync_public: bool) -> int:
    text = file_path.read_text(encoding="utf-8", errors="ignore")
    ld_items = extract_jsonld_products(text)
    added = 0

    for obj in ld_items:
        name = html.unescape(str(obj.get("name", "")).strip())
        if not name:
            continue

        sku = str(obj.get("sku") or obj.get("mpn") or obj.get("gtin13") or "").strip()
        brand_raw = obj.get("brand", "")
        if isinstance(brand_raw, dict):
            brand = str(brand_raw.get("name", "Genérica")).strip()
        else:
            brand = str(brand_raw or "Genérica").strip()

        offers = obj.get("offers", {})
        if isinstance(offers, list) and offers:
            offers = offers[0]
        price = parse_price(offers.get("price") if isinstance(offers, dict) else 0)
        description = html.unescape(str(obj.get("description", "")).strip())[:240]

        img_raw = obj.get("image")
        img_url = ""
        if isinstance(img_raw, list) and img_raw:
            img_url = str(img_raw[0])
        elif isinstance(img_raw, dict):
            img_url = str(img_raw.get("url", ""))
        elif isinstance(img_raw, str):
            img_url = img_raw

        cat, corridor, aisle = infer_category_and_corridor(name, str(obj.get("category", "")))
        pid = f"imp-{slugify(sku or name)}"
        local_raw = COLLECTED_IMAGES_DIR / f"{pid}.raw.jpg"
        local_norm = (PUBLIC_PRODUCTS_DIR if sync_public else COLLECTED_IMAGES_DIR) / f"{pid}.jpg"

        image_saved = False
        # Tenta localizar imagem salva na pasta *_files do navegador primeiro (100% offline)
        sibling_dir = file_path.with_name(f"{file_path.stem}_files")
        if sibling_dir.is_dir() and img_url:
            img_basename = Path(urllib.parse.urlparse(img_url).path).name
            candidate = sibling_dir / img_basename
            if candidate.exists():
                shutil.copyfile(candidate, local_raw)
                image_saved = normalize_image_4x3(local_raw, local_norm)

        if not image_saved and img_url.startswith("http"):
            if download_image(img_url, local_raw):
                image_saved = normalize_image_4x3(local_raw, local_norm)

        if local_raw.exists():
            local_raw.unlink(missing_ok=True)

        leroy_brands = {"dexter", "sensea", "luxens", "standers", "axton", "inspire", "spaceo", "naterial", "equation", "artensi"}
        db[pid] = {
            "id": pid,
            "sku": sku or pid.upper(),
            "brand": brand,
            "leroyExclusive": brand.lower() in leroy_brands,
            "name": name,
            "imageUrl": f"/products/{pid}.jpg" if (image_saved and sync_public) else str(local_norm),
            "category": cat,
            "price": price,
            "unit": "un.",
            "aisle": aisle,
            "corridorCode": corridor,
            "shelfLocation": "Módulo 02 · Prateleira 2",
            "description": description or f"{name} — marca {brand}.",
            "source": f"local-html:{file_path.name}",
            "collectedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
        added += 1
        print(f"  [+] Importado HTML: {brand} | {name} | R$ {price:.2f} | img={'OK' if image_saved else 'PENDENTE'}")

    return added


def ingest_csv_file(file_path: Path, db: Dict[str, Dict[str, Any]], sync_public: bool) -> int:
    """Importa planilha CSV com colunas: sku,brand,name,price,category,description,image_url"""
    added = 0
    with file_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("name") or row.get("nome") or "").strip()
            if not name:
                continue
            sku = (row.get("sku") or row.get("codigo") or "").strip()
            brand = (row.get("brand") or row.get("marca") or "Leroy Merlin").strip()
            price = parse_price(row.get("price") or row.get("preco") or 0)
            cat_hint = (row.get("category") or row.get("categoria") or "").strip()
            desc = (row.get("description") or row.get("descricao") or "").strip()
            img_url = (row.get("image_url") or row.get("imagem") or "").strip()

            cat, corridor, aisle = infer_category_and_corridor(name, cat_hint)
            pid = f"csv-{slugify(sku or name)}"
            local_raw = COLLECTED_IMAGES_DIR / f"{pid}.raw.jpg"
            local_norm = (PUBLIC_PRODUCTS_DIR if sync_public else COLLECTED_IMAGES_DIR) / f"{pid}.jpg"

            image_saved = False
            if img_url.startswith("http") and download_image(img_url, local_raw):
                image_saved = normalize_image_4x3(local_raw, local_norm)
            elif img_url and Path(img_url).exists():
                image_saved = normalize_image_4x3(Path(img_url), local_norm)
            if local_raw.exists():
                local_raw.unlink(missing_ok=True)

            db[pid] = {
                "id": pid,
                "sku": sku or pid.upper(),
                "brand": brand,
                "name": name,
                "imageUrl": f"/products/{pid}.jpg" if (image_saved and sync_public) else str(local_norm),
                "category": cat,
                "price": price,
                "unit": "un.",
                "aisle": aisle,
                "corridorCode": corridor,
                "shelfLocation": "Módulo 01 · Prateleira 2",
                "description": desc or f"{name} ({brand}).",
                "source": f"local-csv:{file_path.name}",
                "collectedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
            added += 1
            print(f"  [+] Importado CSV: {brand} | {name} | R$ {price:.2f}")
    return added


def cmd_import_pages(watch: bool, interval: float, sync_public: bool) -> None:
    INPUT_PAGES_DIR.mkdir(parents=True, exist_ok=True)
    COLLECTED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Cria arquivo CSV de exemplo se a pasta estiver vazia
    sample_csv = INPUT_PAGES_DIR / "exemplo_produtos.csv"
    if not any(INPUT_PAGES_DIR.iterdir()):
        sample_csv.write_text(
            "sku,brand,name,price,category,description,image_url\n"
            "90716584,Sensea,Torneira Lavatório Mesa Bica Alta Cromada Sensea,189.90,Hidráulica,Acabamento cromado com arejador econômico.,\n"
            "91916923,Dexter,Jogo de Chaves Combinadas 8 Peças Aço Cromo Vanádio Dexter,119.90,Ferramentas,Kit completo de 8mm a 19mm para manutenção doméstica.,\n",
            encoding="utf-8",
        )
        print(f"[INFO] Criado modelo de planilha em: {sample_csv}")

    processed: Dict[str, float] = {}
    print(f"[IMPORTADOR] Monitorando pasta: {INPUT_PAGES_DIR}")
    if watch:
        print(f"[WATCH] Rodando continuamente (Ctrl+C para encerrar). Salve páginas .html ou .csv na pasta acima.")

    try:
        while True:
            db = load_catalog_db()
            total_new = 0
            for fp in sorted(INPUT_PAGES_DIR.iterdir()):
                if not fp.is_file():
                    continue
                mtime = fp.stat().st_mtime
                if processed.get(str(fp)) == mtime:
                    continue
                suffix = fp.suffix.lower()
                if suffix in (".html", ".htm"):
                    total_new += ingest_html_file(fp, db, sync_public)
                elif suffix == ".csv":
                    total_new += ingest_csv_file(fp, db, sync_public)
                processed[str(fp)] = mtime

            if total_new > 0:
                save_catalog_db(db)
                print(f"[SALVO] {total_new} registro(s) atualizado(s). Total no banco: {len(db)} -> {OUTPUT_JSON_PATH}")

            if not watch:
                break
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[ENCERRADO] Monitoramento finalizado pelo usuário.")


# ---------------------------------------------------------------------------
# MODO 3: COLETOR CONTÍNUO WIKIMEDIA COMMONS (API PÚBLICA OFICIAL, HTTP 200)
# ---------------------------------------------------------------------------
def cmd_wikimedia(limit: int, delay: float, sync_public: bool) -> None:
    COLLECTED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    db = load_catalog_db()
    collected = 0
    print(f"[WIKIMEDIA API] Iniciando coleta aberta (limite={limit}, intervalo={delay}s)...")

    for cat, query, corridor, aisle in DEFAULT_WIKIMEDIA_QUEUE:
        if collected >= limit:
            break
        q = urllib.parse.quote(f"{query} filetype:bitmap")
        url = (
            "https://commons.wikimedia.org/w/api.php?"
            f"action=query&generator=search&gsrsearch={q}&gsrnamespace=6&gsrlimit=3"
            "&prop=imageinfo&iiprop=url|size|mime|extmetadata&iiurlwidth=800&format=json"
        )
        try:
            data = http_get_json(url)
        except Exception as exc:
            print(f"  [erro API] '{query}': {exc}")
            time.sleep(delay)
            continue

        pages = list((data.get("query", {}).get("pages") or {}).values())
        for page in pages:
            if collected >= limit:
                break
            info_list = page.get("imageinfo") or []
            if not info_list:
                continue
            info = info_list[0]
            mime = info.get("mime", "")
            w = int(info.get("width", 0))
            h = int(info.get("height", 0))
            thumb_url = info.get("thumburl") or info.get("url")
            if mime not in ("image/jpeg", "image/png") or w < 450 or h < 300 or not thumb_url:
                continue

            title_clean = page.get("title", "").replace("File:", "").rsplit(".", 1)[0].replace("_", " ")
            pid = f"wm-{slugify(title_clean)}"
            if pid in db:
                continue

            raw_file = COLLECTED_IMAGES_DIR / f"{pid}.raw.jpg"
            final_file = (PUBLIC_PRODUCTS_DIR if sync_public else COLLECTED_IMAGES_DIR) / f"{pid}.jpg"

            if download_image(thumb_url, raw_file) and normalize_image_4x3(raw_file, final_file):
                raw_file.unlink(missing_ok=True)
                ext = info.get("extmetadata") or {}
                license_name = (ext.get("LicenseShortName") or {}).get("value", "CC / Wikimedia Commons")
                db[pid] = {
                    "id": pid,
                    "sku": f"WM-{abs(hash(pid)) % 90000000 + 10000000}",
                    "brand": "Referência Aberta",
                    "name": title_clean[:78],
                    "imageUrl": f"/products/{pid}.jpg" if sync_public else str(final_file),
                    "category": cat,
                    "price": 0.0,
                    "unit": "un.",
                    "aisle": aisle,
                    "corridorCode": corridor,
                    "shelfLocation": "Módulo 01 · Prateleira 2",
                    "description": f"Imagem real aberta ({license_name}) coletada para {cat}.",
                    "license": license_name,
                    "sourceUrl": info.get("descriptionurl", thumb_url),
                    "collectedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
                }
                collected += 1
                save_catalog_db(db)
                print(f"  [{collected}/{limit}] {cat} -> {title_clean[:52]} ({license_name})")
                break

        time.sleep(delay)

    print(f"[CONCLUÍDO] {collected} novos itens salvos em {OUTPUT_JSON_PATH}")


# ---------------------------------------------------------------------------
# MODO 4: CONECTOR OFICIAL ADEO / LEROY MERLIN PARTNER API
# ---------------------------------------------------------------------------
def cmd_adeo_api(query: str, limit: int) -> None:
    api_key = os.environ.get("ADEO_API_KEY", "").strip()
    base_url = os.environ.get(
        "ADEO_API_BASE_URL",
        "https://api-gateway.adeo.com/api-catalog/v2/products",
    ).rstrip("/")

    if not api_key:
        print("[REQUER CHAVE DE PARCEIRO] Variável ADEO_API_KEY não definida.")
        print("Passos para obter acesso oficial durante a mentoria da Leroy Merlin / FIAP:")
        print("  1. Solicite credencial Sandbox no portal developer.adeo.com ou com os mentores Leroy Merlin.")
        print("  2. No PowerShell, defina:  $env:ADEO_API_KEY = 'SUA_CHAVE_AQUI'")
        print("  3. Execute novamente:      python scripts/catalog_collector.py --mode adeo-api --query torneira")
        sys.exit(2)

    qs = urllib.parse.urlencode({"query": query, "limit": limit, "country": "BR"})
    url = f"{base_url}?{qs}"
    print(f"[ADEO API] Consultando {url} ...")
    try:
        data = http_get_json(url, headers={"X-Gateway-APIKey": api_key})
        items = data.get("products") or data.get("items") or []
        db = load_catalog_db()
        for it in items:
            sku = str(it.get("adeoId") or it.get("sku") or it.get("id") or "")
            name = str(it.get("label") or it.get("name") or "").strip()
            if not name:
                continue
            pid = f"adeo-{slugify(sku or name)}"
            cat, corridor, aisle = infer_category_and_corridor(name, str(it.get("department", "")))
            db[pid] = {
                "id": pid,
                "sku": sku,
                "brand": str(it.get("brand", "Leroy Merlin")),
                "name": name,
                "imageUrl": str(it.get("imageUrl") or ""),
                "category": cat,
                "price": parse_price(it.get("price", 0)),
                "unit": "un.",
                "aisle": aisle,
                "corridorCode": corridor,
                "shelfLocation": "Sincronizado via ADEO API",
                "description": str(it.get("description", ""))[:240],
                "source": "adeo-official-api",
                "collectedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
        save_catalog_db(db)
        print(f"[OK] {len(items)} produtos sincronizados em {OUTPUT_JSON_PATH}")
    except urllib.error.HTTPError as exc:
        print(f"[ERRO HTTP {exc.code}] Verifique validade/escopo da ADEO_API_KEY: {exc.reason}")
        sys.exit(1)


# ---------------------------------------------------------------------------
# MODO 5: NORMALIZAR TODAS AS FOTOS DO APP PARA 4:3 (640x480)
# ---------------------------------------------------------------------------
def cmd_normalize_images(folder: Path) -> None:
    if not folder.exists():
        print(f"[ERRO] Pasta não encontrada: {folder}")
        sys.exit(1)
    files = sorted(folder.glob("*.jpg"))
    print(f"[NORMALIZADOR 4:3] Processando {len(files)} fotos em {folder} ...")
    ok = 0
    for f in files:
        tmp = f.with_suffix(".tmp.jpg")
        if normalize_image_4x3(f, tmp):
            shutil.move(str(tmp), str(f))
            ok += 1
            print(f"  [OK] {f.name}")
        else:
            tmp.unlink(missing_ok=True)
    print(f"[CONCLUÍDO] {ok}/{len(files)} imagens padronizadas em 640x480 (4:3).")


# ---------------------------------------------------------------------------
# MODO 6: EXPORTAR PARA TYPESCRIPT
# ---------------------------------------------------------------------------
def cmd_export_ts() -> None:
    db = load_catalog_db()
    items = list(db.values())
    header = (
        "// Gerado automaticamente por scripts/catalog_collector.py\n"
        'import { Product } from "../lib/types";\n\n'
        "export const COLLECTED_PRODUCTS: Product[] = "
    )
    payload = []
    for it in items:
        payload.append({
            "id": it["id"],
            "sku": it.get("sku", "00000000"),
            "brand": it.get("brand", "Leroy Merlin"),
            "leroyExclusive": bool(it.get("leroyExclusive", False)),
            "name": it["name"],
            "imageUrl": it.get("imageUrl", ""),
            "category": it.get("category", "Materiais Básicos"),
            "price": float(it.get("price", 0)),
            "unit": it.get("unit", "un."),
            "aisle": it.get("aisle", "M4"),
            "corridorCode": it.get("corridorCode", "C24"),
            "shelfLocation": it.get("shelfLocation", "Módulo 01 · Prateleira 2"),
            "description": it.get("description", ""),
            "laymanTerms": [it["name"].lower()],
            "tags": slugify(it["name"]).split("-"),
            "stockByStore": {"es-vitoria": 18, "sp-tiete": 14, "rj-barra": 12},
        })
    OUTPUT_TS_PATH.write_text(
        header + json.dumps(payload, indent=2, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print(f"[EXPORTADO] {len(payload)} SKUs gravados em {OUTPUT_TS_PATH}")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(
        description="LM Copiloto — Coletor, Importador e Normalizador de Catálogo"
    )
    parser.add_argument(
        "--mode",
        required=True,
        choices=["status", "import-pages", "wikimedia", "adeo-api", "normalize-images", "export-ts"],
        help="Modo de operação do pipeline",
    )
    parser.add_argument("--watch", action="store_true", help="Mantém o import-pages rodando continuamente")
    parser.add_argument("--interval", type=float, default=3.0, help="Intervalo do --watch em segundos")
    parser.add_argument("--limit", type=int, default=10, help="Limite de itens na coleta")
    parser.add_argument("--delay", type=float, default=1.5, help="Pausa educada entre requisições (s)")
    parser.add_argument("--query", type=str, default="torneira", help="Termo de busca (modo adeo-api)")
    parser.add_argument("--sync-public", action="store_true", help="Salva fotos normalizadas direto em public/products/")
    parser.add_argument("--folder", type=str, default=str(PUBLIC_PRODUCTS_DIR), help="Pasta para normalize-images")
    args = parser.parse_args()

    if args.mode == "status":
        cmd_status()
    elif args.mode == "import-pages":
        cmd_import_pages(watch=args.watch, interval=args.interval, sync_public=args.sync_public)
    elif args.mode == "wikimedia":
        cmd_wikimedia(limit=args.limit, delay=args.delay, sync_public=args.sync_public)
    elif args.mode == "adeo-api":
        cmd_adeo_api(query=args.query, limit=args.limit)
    elif args.mode == "normalize-images":
        cmd_normalize_images(Path(args.folder))
    elif args.mode == "export-ts":
        cmd_export_ts()


if __name__ == "__main__":
    main()
