"""Análisis estadístico de los billetes de 5 dígitos.

Para cada posición (0..4) se combinan tres señales sobre los dígitos 0-9:
  1. Frecuencia histórica (suavizada con Laplace).
  2. "Calientes": frecuencia con decaimiento exponencial (sorteos recientes pesan más).
  3. Cadena de Markov de 1er orden: P(dígito siguiente | dígito del sorteo anterior).
"""
from collections import Counter
from itertools import product
from typing import Dict, List

DIGITS = range(10)
POSITIONS = 5
WEIGHTS = {"frecuencia": 0.4, "caliente": 0.3, "markov": 0.3}
DECAY = 0.9  # peso del sorteo k-ésimo más antiguo = DECAY**k
ALPHA = 1.0  # suavizado de Laplace


def _normalize(scores: List[float]) -> List[float]:
    total = sum(scores)
    return [s / total for s in scores]


def frequency(digits: List[int]) -> List[float]:
    counts = Counter(digits)
    return _normalize([counts[d] + ALPHA for d in DIGITS])


def hot(digits_newest_first: List[int]) -> List[float]:
    scores = [ALPHA * 0.1] * 10
    for age, d in enumerate(digits_newest_first):
        scores[d] += DECAY**age
    return _normalize(scores)


def markov(digits_oldest_first: List[int]) -> List[float]:
    """Distribución del próximo dígito dado el último observado."""
    last = digits_oldest_first[-1]
    counts = Counter(
        b for a, b in zip(digits_oldest_first, digits_oldest_first[1:]) if a == last
    )
    return _normalize([counts[d] + ALPHA for d in DIGITS])


def _alternatives(positions: List[Dict], count: int) -> List[Dict]:
    """Siguientes mejores billetes (excluyendo el recomendado) por probabilidad conjunta."""
    top = [
        sorted(p["distribucion"], key=lambda x: -x["probabilidad"])[:4]
        for p in positions
    ]
    combos = []
    for combo in product(*top):
        joint = 1.0
        for c in combo:
            joint *= c["probabilidad"] / 100
        combos.append(("".join(str(c["digito"]) for c in combo), joint))
    combos.sort(key=lambda x: -x[1])
    random_joint = 1 / 100_000
    return [
        {
            "numero": n,
            "probabilidad": round(j * 100, 5),
            "veces_azar": round(j / random_joint, 2),
        }
        for n, j in combos[1 : count + 1]
    ]


def predict(draws_newest_first: List[Dict]) -> Dict:
    if len(draws_newest_first) < 2:
        raise ValueError("Se necesitan al menos 2 sorteos para calcular.")
    tickets = [d["numero"] for d in draws_newest_first]
    positions = []
    for pos in range(POSITIONS):
        newest_first = [int(t[pos]) for t in tickets]
        oldest_first = newest_first[::-1]
        parts = {
            "frecuencia": frequency(newest_first),
            "caliente": hot(newest_first),
            "markov": markov(oldest_first),
        }
        combined = [
            sum(WEIGHTS[k] * parts[k][d] for k in WEIGHTS) for d in DIGITS
        ]
        best = max(DIGITS, key=lambda d: combined[d])
        positions.append(
            {
                "posicion": pos + 1,
                "digito": best,
                "probabilidad": round(combined[best] * 100, 2),
                "distribucion": [
                    {
                        "digito": d,
                        "probabilidad": round(combined[d] * 100, 2),
                        "frecuencia": round(parts["frecuencia"][d] * 100, 2),
                        "caliente": round(parts["caliente"][d] * 100, 2),
                        "markov": round(parts["markov"][d] * 100, 2),
                    }
                    for d in DIGITS
                ],
            }
        )
    return {
        "numero": "".join(str(p["digito"]) for p in positions),
        "alternativas": _alternatives(positions, 3),
        "sorteos_analizados": len(tickets),
        "posiciones": positions,
        "modelo": {"pesos": WEIGHTS, "decaimiento": DECAY},
        "probabilidad_azar_por_digito": 10.0,
        "probabilidad_azar_billete_completo": 0.001,
        "advertencia": (
            "Cada sorteo es un evento independiente: estas tendencias NO "
            "aumentan realmente la probabilidad de ganar. Probabilidad real "
            "de cualquier billete: 1 en 100,000. Juega con responsabilidad."
        ),
    }
