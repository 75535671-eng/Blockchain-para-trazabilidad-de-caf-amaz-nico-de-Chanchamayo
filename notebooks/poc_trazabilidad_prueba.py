"""PoC RF-IA-02 con datos de prueba.

Estima si la trazabilidad previa a la exportación está completa.
No usa el índice ni la etiqueta como entrada. No mira la etapa EXPORTACION.
Los registros son sintéticos y la semilla deja el experimento reproducible.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

RAIZ = Path(__file__).resolve().parent
CARPETA = RAIZ / "datos"
SEMILLA = 42
N = 200
PRUEBA = 0.25

# Umbrales fijados antes de mirar los resultados.
META_ACCURACY = 0.70
META_F1 = 0.65
META_INFERENCIA_MS = 100.0
UMBRAL_INDICE = 2.15

ETAPAS = ["BENEFICIO", "TRILLA", "ALMACENAMIENTO", "TRASLADO"]
ENTRADAS = [
    "tiene_beneficio",
    "tiene_trilla",
    "tiene_almacenamiento",
    "tiene_traslado",
    "orden_cronologico",
    "humedad_ausente",
    "humedad_porcentaje",
    "dias_entre_extremos",
]


def construir_dataset(rng: np.random.Generator) -> pd.DataFrame:
    filas = []
    for i in range(1, N + 1):
        presentes = [etapa for etapa in ETAPAS if rng.random() < 0.72]
        humedad = float(rng.uniform(9.0, 13.0)) if "BENEFICIO" in presentes else None
        fechas: dict[str, int] = {}
        if len(presentes) > 1 and rng.random() < 0.28:
            secuencia = presentes.copy()
            rng.shuffle(secuencia)
        else:
            secuencia = [etapa for etapa in ETAPAS if etapa in presentes]
        dia = 0
        for etapa in secuencia:
            dia += int(rng.integers(2, 16))
            fechas[etapa] = dia
        ordenadas = sorted(presentes, key=lambda etapa: fechas[etapa])
        catalogo = [etapa for etapa in ETAPAS if etapa in presentes]
        orden = int(ordenadas == catalogo) if presentes else 0
        dias = (fechas[ordenadas[-1]] - fechas[ordenadas[0]]) if len(presentes) > 1 else 0
        penal_humedad = -0.70 if humedad is None else -0.35 * abs(humedad - 11.0)
        indice = (
            0.90 * int("BENEFICIO" in presentes)
            + 0.70 * int("TRILLA" in presentes)
            + 0.60 * int("ALMACENAMIENTO" in presentes)
            + 0.80 * int("TRASLADO" in presentes)
            + 0.50 * orden
            + penal_humedad
            - 0.02 * max(0, dias - 30)
            + float(rng.normal(0, 0.45))
        )
        filas.append(
            {
                "lote_id": f"TRAZA-{i:03d}",
                "tiene_beneficio": int("BENEFICIO" in presentes),
                "tiene_trilla": int("TRILLA" in presentes),
                "tiene_almacenamiento": int("ALMACENAMIENTO" in presentes),
                "tiene_traslado": int("TRASLADO" in presentes),
                "orden_cronologico": orden,
                "humedad_ausente": int(humedad is None),
                "humedad_porcentaje": round(11.0 if humedad is None else humedad, 2),
                "dias_entre_extremos": int(dias),
                "indice_trazabilidad": round(indice, 4),
                "trazabilidad_completa": "Completa" if indice >= UMBRAL_INDICE else "Incompleta",
                "origen_dato": "sintetico_de_prueba",
            }
        )
    return pd.DataFrame(filas)


def medir_inferencia_ms(modelo, entradas) -> float:
    tiempos = []
    for _ in range(30):
        inicio = time.perf_counter()
        modelo.predict(entradas)
        tiempos.append((time.perf_counter() - inicio) * 1000)
    return float(np.median(tiempos))


def decidir(accuracy: float, f1: float, inferencia: float) -> str:
    if accuracy >= META_ACCURACY and f1 >= META_F1 and inferencia <= META_INFERENCIA_MS:
        return "GO"
    if accuracy >= 0.55 and f1 >= 0.50:
        return "GO CON CONDICIONES"
    return "NO-GO"


def exportar_logistica(modelo: Pipeline) -> dict:
    escalador = modelo.named_steps["prep"]
    logistica = modelo.named_steps["modelo"]
    return {
        "entradas": ENTRADAS,
        "media": escalador.mean_.tolist(),
        "escala": escalador.scale_.tolist(),
        "clases": logistica.classes_.tolist(),
        "coeficientes": logistica.coef_.tolist(),
        "intercepto": logistica.intercept_.tolist(),
    }


def main() -> None:
    CARPETA.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEMILLA)
    datos = construir_dataset(rng)
    datos.to_csv(CARPETA / "dataset_prueba_poc_trazabilidad.csv", index=False)

    entradas = datos[ENTRADAS]
    etiqueta = datos["trazabilidad_completa"]
    x_train, x_test, y_train, y_test = train_test_split(
        entradas,
        etiqueta,
        test_size=PRUEBA,
        random_state=SEMILLA,
        stratify=etiqueta,
    )

    clasificadores = {
        "Regresión logística": LogisticRegression(max_iter=500),
        "Random Forest": RandomForestClassifier(n_estimators=200, random_state=SEMILLA),
        "Gradient Boosting": GradientBoostingClassifier(random_state=SEMILLA),
    }
    filas = []
    logistica = None
    for nombre, estimador in clasificadores.items():
        modelo = Pipeline([("prep", StandardScaler()), ("modelo", estimador)])
        modelo.fit(x_train, y_train)
        predicho = modelo.predict(x_test)
        accuracy = float(accuracy_score(y_test, predicho))
        f1 = float(f1_score(y_test, predicho, average="macro"))
        inferencia = medir_inferencia_ms(modelo, x_test)
        filas.append(
            {
                "modelo": nombre,
                "accuracy": round(accuracy, 4),
                "f1_macro": round(f1, 4),
                "inferencia_ms": round(inferencia, 3),
                "decision_experimental": decidir(accuracy, f1, inferencia),
            }
        )
        if nombre == "Regresión logística":
            logistica = modelo

    if logistica is None:
        raise RuntimeError("No se entrenó la regresión logística.")

    mejor = max(filas, key=lambda fila: (fila["f1_macro"], fila["accuracy"]))
    ejemplo = datos.iloc[1]
    vector = ejemplo[ENTRADAS].to_frame().T
    prediccion_ejemplo = str(logistica.predict(vector)[0])
    conteo = etiqueta.value_counts().to_dict()
    resultado = {
        "identificador": "PoC RF-IA-02",
        "pregunta": "Estimar si la trazabilidad previa a la exportación está completa.",
        "semilla": SEMILLA,
        "registros": int(len(datos)),
        "entrenamiento": int(len(x_train)),
        "prueba": int(len(x_test)),
        "umbral_indice": UMBRAL_INDICE,
        "entradas": ENTRADAS,
        "excluido_de_la_entrada": ["indice_trazabilidad", "trazabilidad_completa", "EXPORTACION"],
        "conteo_clases": {clave: int(valor) for clave, valor in conteo.items()},
        "clasificacion": filas,
        "mejor_clasificador": mejor,
        "decision_experimental": mejor["decision_experimental"],
        "decision_integracion": "GO CON CONDICIONES",
        "ejemplo": {
            "lote_id": str(ejemplo["lote_id"]),
            "entradas": {clave: float(ejemplo[clave]) for clave in ENTRADAS},
            "indice_trazabilidad": float(ejemplo["indice_trazabilidad"]),
            "etiqueta": str(ejemplo["trazabilidad_completa"]),
            "prediccion_logistica": prediccion_ejemplo,
        },
        "modelo_logistico": exportar_logistica(logistica),
        "versiones": {
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit-learn": __import__("sklearn").__version__,
        },
    }
    (CARPETA / "resultados_poc_trazabilidad.json").write_text(
        json.dumps(resultado, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    modelo_json = RAIZ.parent / "backend" / "src" / "adapters" / "out" / "prediccion" / "modelo-trazabilidad.json"
    if modelo_json.parent.exists():
        modelo_json.write_text(
            json.dumps(resultado["modelo_logistico"], ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    fig, ax = plt.subplots(figsize=(7.2, 4.2))
    nombres = [fila["modelo"] for fila in filas]
    posiciones = np.arange(len(nombres))
    ax.bar(posiciones - 0.16, [fila["accuracy"] for fila in filas], width=0.32, label="Accuracy", color="#365004")
    ax.bar(posiciones + 0.16, [fila["f1_macro"] for fila in filas], width=0.32, label="F1 macro", color="#925e06")
    ax.axhline(META_ACCURACY, color="#351903", linestyle="--", linewidth=1, label=f"Meta accuracy {META_ACCURACY}")
    ax.set_xticks(posiciones, nombres)
    ax.set_ylim(0, 1)
    ax.set_ylabel("Puntaje")
    ax.set_title("Trazabilidad completa sobre datos de prueba")
    ax.legend(frameon=False)
    fig.tight_layout()
    fig.savefig(CARPETA / "poc_trazabilidad.png", dpi=140)
    plt.close(fig)
    print(json.dumps({k: resultado[k] for k in ("conteo_clases", "clasificacion", "decision_experimental", "decision_integracion", "ejemplo", "versiones")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
