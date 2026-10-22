from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .predictor import predict
from .scraper import fetch_results

app = FastAPI(title="Lotería Nacional Nicaragua - Análisis estadístico")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"]
)


def _load(force: bool = False):
    try:
        return fetch_results(force=force)
    except Exception as exc:
        raise HTTPException(502, f"No se pudo obtener resultados: {exc}")


@app.get("/api/results")
def results(limit: int = 5):
    return _load()[: max(1, min(limit, 100))]


@app.get("/api/prediction")
def prediction(refresh: bool = False):
    draws = _load(force=refresh)
    try:
        result = predict(draws)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    result["ultimos"] = draws[:5]
    return result


# Frontend web (export de Expo) servido desde el mismo servicio; debe ir al final.
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="web")
