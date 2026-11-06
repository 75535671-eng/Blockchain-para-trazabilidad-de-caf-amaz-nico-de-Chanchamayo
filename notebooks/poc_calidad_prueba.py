"""PoC RF-IA-01 con datos de prueba.

Estima la calidad de catación a partir de altitud, variedad, método de beneficio
y humedad. No usa la puntuación como entrada. No predice hashes ni etapas.
Los registros son sintéticos y la semilla deja el experimento reproducible.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RAIZ = Path(__file__).resolve().parent
CARPETA = RAIZ / "datos"
SEMILLA = 42
N = 200
PRUEBA = 0.25

# Umbrales fijados antes de mirar los resultados.
META_ACCURACY = 0.70
META_F1 = 0.65
META_MAE = 2.5
META_R2 = 0.55
META_INFERENCIA_MS = 100.0

VARIEDADES = np.array(["Caturra", "Typica", "Bourbon", "Pache"])
METODOS = np.array(["Lavado", "Honey", "Natural"])
EFECTO_VARIEDAD = {"Caturra": 0.4, "Typica": 1.5, "Bourbon": 1.2, "Pache": -0.6}
EFECTO_METODO = {"Lavado": 1.4, "Honey": 0.6, "Natural": 0.2}


def calidad_de(puntaje: float) -> str:
    if puntaje >= 85:
        return "Especial"
    if puntaje >= 80:
        return "Premium"
    return "Comercial"


def construir_dataset(rng: np.random.Generator) -> pd.DataFrame:
    altitud = rng.uniform(900, 1800, N)
    variedad = rng.choice(VARIEDADES, N)
    metodo = rng.choice(METODOS, N)
    humedad = rng.uniform(9.0, 13.0, N)
    ruido = rng.normal(0, 2.0, N)
    puntaje = (
        80
        + (altitud - 1200) / 150 * 2.0
        + np.array([EFECTO_VARIEDAD[v] for v in variedad])
        + np.array([EFECTO_METODO[m] for m in metodo])
        - np.abs(humedad - 11) * 1.3
        + ruido
    )
    puntaje = np.clip(puntaje, 70, 94)
    return pd.DataFrame(
        {
            "lote_id": [f"PRUEBA-{i:03d}" for i in range(1, N + 1)],
            "altitud_msnm": np.round(altitud, 1),
            "variedad_cafe": variedad,
            "metodo_beneficio": metodo,
            "humedad_porcentaje": np.round(humedad, 2),
            "puntuacion_catacion": np.round(puntaje, 2),
            "calidad_tipo": [calidad_de(p) for p in puntaje],
            "origen_dato": "sintetico_de_prueba",
        }
    )


def preprocesador() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), ["altitud_msnm", "humedad_porcentaje"]),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore"),
                ["variedad_cafe", "metodo_beneficio"],
            ),
        ]
    )


def medir_inferencia_ms(modelo, entradas) -> float:
    tiempos = []
    for _ in range(30):
        inicio = time.perf_counter()
        modelo.predict(entradas)
        tiempos.append((time.perf_counter() - inicio) * 1000)
    return float(np.median(tiempos))


def decidir_clasificacion(accuracy: float, f1: float, inferencia: float) -> str:
    if accuracy >= META_ACCURACY and f1 >= META_F1 and inferencia <= META_INFERENCIA_MS:
        return "GO"
    if accuracy >= 0.55 and f1 >= 0.50:
        return "GO CON CONDICIONES"
    return "NO-GO"


def main() -> None:
    CARPETA.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEMILLA)
    datos = construir_dataset(rng)
    csv = CARPETA / "dataset_prueba_poc_cafe.csv"
    datos.to_csv(csv, index=False)

    entradas = datos[["altitud_msnm", "variedad_cafe", "metodo_beneficio", "humedad_porcentaje"]]
    y_calidad = datos["calidad_tipo"]
    y_puntaje = datos["puntuacion_catacion"]
    (
        x_train,
        x_test,
        y_cal_train,
        y_cal_test,
        y_pun_train,
        y_pun_test,
    ) = train_test_split(
        entradas,
        y_calidad,
        y_puntaje,
        test_size=PRUEBA,
        random_state=SEMILLA,
        stratify=y_calidad,
    )

    clasificadores = {
        "Regresión logística": LogisticRegression(max_iter=500),
        "Random Forest": RandomForestClassifier(n_estimators=200, random_state=SEMILLA),
        "Gradient Boosting": GradientBoostingClassifier(random_state=SEMILLA),
    }
    regresores = {
        "Regresión lineal": LinearRegression(),
        "Random Forest": RandomForestRegressor(n_estimators=200, random_state=SEMILLA),
        "Gradient Boosting": GradientBoostingRegressor(random_state=SEMILLA),
    }

    filas_clasificacion = []
    for nombre, estimador in clasificadores.items():
        modelo = Pipeline([("prep", preprocesador()), ("modelo", estimador)])
        modelo.fit(x_train, y_cal_train)
        predicho = modelo.predict(x_test)
        accuracy = float(accuracy_score(y_cal_test, predicho))
        f1 = float(f1_score(y_cal_test, predicho, average="macro"))
        inferencia = medir_inferencia_ms(modelo, x_test)
        filas_clasificacion.append(
            {
                "modelo": nombre,
                "accuracy": round(accuracy, 4),
                "f1_macro": round(f1, 4),
                "inferencia_ms": round(inferencia, 3),
                "decision_experimental": decidir_clasificacion(accuracy, f1, inferencia),
            }
        )

    filas_regresion = []
    for nombre, estimador in regresores.items():
        modelo = Pipeline([("prep", preprocesador()), ("modelo", estimador)])
        modelo.fit(x_train, y_pun_train)
        predicho = modelo.predict(x_test)
        mae = float(mean_absolute_error(y_pun_test, predicho))
        rmse = float(np.sqrt(mean_squared_error(y_pun_test, predicho)))
        r2 = float(r2_score(y_pun_test, predicho))
        inferencia = medir_inferencia_ms(modelo, x_test)
        filas_regresion.append(
            {
                "modelo": nombre,
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "r2": round(r2, 4),
                "inferencia_ms": round(inferencia, 3),
            }
        )

    mejor = max(filas_clasificacion, key=lambda fila: (fila["f1_macro"], fila["accuracy"]))
    conteo = datos["calidad_tipo"].value_counts().to_dict()
    resultado = {
        "identificador": "PoC RF-IA-01",
        "semilla": SEMILLA,
        "registros": int(len(datos)),
        "entrenamiento": int(len(x_train)),
        "prueba": int(len(x_test)),
        "conteo_clases": {clave: int(valor) for clave, valor in conteo.items()},
        "clasificacion": filas_clasificacion,
        "regresion": filas_regresion,
        "mejor_clasificador": mejor,
        "decision_experimental": mejor["decision_experimental"],
        "decision_integracion": "GO CON CONDICIONES",
        "versiones": {
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit-learn": __import__("sklearn").__version__,
        },
    }
    (CARPETA / "resultados_poc.json").write_text(
        json.dumps(resultado, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    fig, ax = plt.subplots(figsize=(7.2, 4.2))
    nombres = [fila["modelo"] for fila in filas_clasificacion]
    posiciones = np.arange(len(nombres))
    ax.bar(posiciones - 0.16, [fila["accuracy"] for fila in filas_clasificacion], width=0.32, label="Accuracy", color="#365004")
    ax.bar(posiciones + 0.16, [fila["f1_macro"] for fila in filas_clasificacion], width=0.32, label="F1 macro", color="#925e06")
    ax.axhline(META_ACCURACY, color="#351903", linestyle="--", linewidth=1, label=f"Meta accuracy {META_ACCURACY}")
    ax.set_xticks(posiciones, nombres)
    ax.set_ylim(0, 1)
    ax.set_ylabel("Puntaje")
    ax.set_title("Clasificación de calidad sobre datos de prueba")
    ax.legend(frameon=False)
    fig.tight_layout()
    fig.savefig(CARPETA / "poc_clasificacion.png", dpi=140)
    plt.close(fig)
    print(json.dumps(resultado, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
