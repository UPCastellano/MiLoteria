from app.predictor import predict
from app.scraper import parse_results

HTML = """
<div class="ls-card"><div class="ls-numero">Sorteo 2301</div>
<div class="ls-info"><div><b>Ganador:</b> 18955</div><div><b>Premio:</b> C$8,000,000</div>
<div><b>Fecha:</b> 20/10/2026</div><div><b>Sucursal:</b> Juigalpa</div></div></div>
<div class="ls-card"><div class="ls-numero">Sorteo 2300</div>
<div class="ls-info"><div><b>Ganador:</b> 05760</div><div><b>Fecha:</b> 13/10/2026</div></div></div>
"""


def test_parse():
    d = parse_results(HTML)
    assert [x["numero"] for x in d] == ["18955", "05760"]
    assert d[0]["fecha"] == "2026-10-20" and d[0]["sucursal"] == "Juigalpa"


def test_predict():
    r = predict(parse_results(HTML) * 5)
    assert len(r["numero"]) == 5 and r["numero"].isdigit()
    for p in r["posiciones"]:
        assert abs(sum(x["probabilidad"] for x in p["distribucion"]) - 100) < 0.2
