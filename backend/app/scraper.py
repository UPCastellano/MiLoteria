"""Scraper de resultados de la Lotería Nacional de Nicaragua.

Estructura HTML esperada en https://loterianacional.com.ni/resultados/ :

    <div class="ls-card">
      <div class="ls-numero">Sorteo 2301</div>
      <div class="ls-info">
        <div><b>Ganador:</b> 18955</div>
        <div><b>Premio:</b> C$8,000,000</div>
        <div><b>Fecha:</b> 20/10/2026</div>
        <div><b>Sucursal:</b> Juigalpa</div>
      </div>
    </div>

Si la página cambia, ajustar los selectores en `parse_results`.
"""
import json
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import requests
from bs4 import BeautifulSoup

URL = "https://loterianacional.com.ni/resultados/"
CACHE_FILE = Path(__file__).parent / "cache.json"
CACHE_TTL_SECONDS = 15 * 60
HEADERS = {"User-Agent": "Mozilla/5.0 (LoteriaProbabilidades educational project)"}


def _field(card, label: str) -> str:
    """Devuelve el texto que sigue a <b>label:</b> dentro de la tarjeta."""
    for b in card.select(".ls-info b"):
        if b.get_text(strip=True).rstrip(":").lower() == label.lower():
            return b.parent.get_text(" ", strip=True).split(":", 1)[1].strip()
    return ""


def _parse_date(text: str) -> str:
    try:
        return datetime.strptime(text, "%d/%m/%Y").date().isoformat()
    except ValueError:
        return text


def parse_results(html: str) -> List[Dict]:
    soup = BeautifulSoup(html, "html.parser")
    draws = []
    for card in soup.select(".ls-card"):
        numero = card.select_one(".ls-numero")
        sorteo = re.search(r"\d+", numero.get_text()) if numero else None
        ganador = re.search(r"\b\d{5}\b", _field(card, "Ganador"))
        if not sorteo or not ganador:
            continue
        draws.append(
            {
                "sorteo": int(sorteo.group()),
                "numero": ganador.group(),
                "premio": _field(card, "Premio"),
                "fecha": _parse_date(_field(card, "Fecha")),
                "sucursal": _field(card, "Sucursal"),
            }
        )
    draws.sort(key=lambda d: d["sorteo"], reverse=True)
    return draws


def fetch_results(force: bool = False) -> List[Dict]:
    """Descarga los resultados (más reciente primero) con caché en disco."""
    if not force and CACHE_FILE.exists():
        if time.time() - CACHE_FILE.stat().st_mtime < CACHE_TTL_SECONDS:
            return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    try:
        resp = requests.get(URL, headers=HEADERS, timeout=20)
        resp.raise_for_status()
        resp.encoding = "utf-8"
        draws = parse_results(resp.text)
        if not draws:
            raise ValueError("No se encontraron sorteos; ¿cambió el HTML de la página?")
        CACHE_FILE.write_text(json.dumps(draws, ensure_ascii=False), encoding="utf-8")
        return draws
    except Exception:
        # Si falla la web, usa la última copia guardada.
        if CACHE_FILE.exists():
            return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        raise
