# Lotería Nacional Nicaragua – Análisis estadístico

App multiplataforma (iOS/Android/Web) con **Expo (React Native)** y backend **FastAPI**.
Fuente: <https://loterianacional.com.ni/resultados/> (sorteos de billete de 5 dígitos).

> ⚠️ Cada sorteo es un evento independiente. Las "tendencias" no aumentan la probabilidad real
> de ganar (1 en 100,000 para cualquier billete). Es un proyecto educativo.

## Estructura

```
LoteriaProbailidades/
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py        # FastAPI: /api/prediction, /api/results
│   │   ├── scraper.py     # requests + BeautifulSoup, caché en disco (15 min)
│   │   └── predictor.py   # frecuencia + calientes (decaimiento) + Markov
│   └── tests/test_core.py
└── frontend/
    ├── App.js             # Pantalla Home
    └── src/api.js         # URL del backend
```

## Modelo

Por cada posición (1-5) se calcula una distribución sobre los dígitos 0-9 combinando:
40 % frecuencia histórica (Laplace) · 30 % "calientes" (peso exponencial, 0.9^edad) ·
30 % cadena de Markov P(dígito | dígito del sorteo anterior). El dígito con mayor
probabilidad en cada posición forma el número recomendado.

## Ejecutar el backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m pytest -q                      # opcional
uvicorn app.main:app --reload --port 8000
```
Prueba: <http://localhost:8000/api/prediction> (docs en `/docs`). `?refresh=true` ignora la caché.

## Ejecutar el frontend

```powershell
cd frontend
npm install
npx expo start        # presiona w (web), a (Android), i (iOS) o escanea el QR con Expo Go
```
- Android emulador usa `10.0.2.2`; iOS/web usan `localhost` (ver `src/api.js`).
- En celular físico cambia `HOST` en `src/api.js` por la IP de tu PC y ejecuta uvicorn con `--host 0.0.0.0`.

## Si el scraper deja de funcionar

El HTML se parsea en `parse_results` (`backend/app/scraper.py`): tarjetas `.ls-card` con
`.ls-numero` y `.ls-info > div > b` (Ganador/Premio/Fecha/Sucursal). Ajusta esos selectores.
Si la web falla, se usa la última copia en `backend/app/cache.json`.
