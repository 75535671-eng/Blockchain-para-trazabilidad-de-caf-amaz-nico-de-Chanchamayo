# -*- coding: utf-8 -*-
"""Carga de prueba: 20 productores, 40 parcelas, 200 lotes y 800 eventos."""

import json
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
NS = uuid.UUID("6f1d8a0e-7c2b-4e55-9a10-0c3b8e2d4f61")
DISTRITOS = ["La Merced", "Perené", "Pichanaqui", "San Ramón", "San Luis de Shuaro", "Vitoc", "Sangani"]
VARIEDADES = ["Caturra", "Typica", "Bourbon", "Pache"]
METODOS = ["Lavado", "Honey", "Natural"]


def uid(nombre: str) -> str:
    return str(uuid.uuid5(NS, nombre))


def sql_texto(valor: str) -> str:
    return "'" + valor.replace("'", "''") + "'"


def predecir(vector: list[float]) -> str:
    modelo = json.loads((RAIZ / "backend" / "src" / "adapters" / "out" / "prediccion" / "modelo-trazabilidad.json").read_text(encoding="utf-8"))
    puntaje = modelo["intercepto"][0]
    for i, valor in enumerate(vector):
        puntaje += ((valor - modelo["media"][i]) / modelo["escala"][i]) * modelo["coeficientes"][0][i]
    return modelo["clases"][1] if puntaje > 0 else modelo["clases"][0]


def main() -> None:
    lineas = [
        "-- Carga de prueba: 20 productores, 40 parcelas, 200 lotes y 800 eventos.",
        "-- Idempotente para los códigos CHNY-2026-VID.",
        "BEGIN;",
        "DELETE FROM variables_productivas WHERE lote_id IN (SELECT id FROM lotes WHERE codigo LIKE 'CHNY-2026-VID%');",
        "DELETE FROM eventos_trazabilidad WHERE lote_id IN (SELECT id FROM lotes WHERE codigo LIKE 'CHNY-2026-VID%');",
        "DELETE FROM analisis_lotes WHERE lote_id IN (SELECT id FROM lotes WHERE codigo LIKE 'CHNY-2026-VID%');",
        "DELETE FROM predicciones_calidad WHERE lote_id IN (SELECT id FROM lotes WHERE codigo LIKE 'CHNY-2026-VID%');",
        "DELETE FROM lotes WHERE codigo LIKE 'CHNY-2026-VID%';",
        "DELETE FROM parcelas WHERE nombre LIKE 'Parcela video %' OR nombre LIKE 'Parcela prueba %';",
        "DELETE FROM productores WHERE documento_identidad LIKE 'VID%';",
    ]
    parcelas = []
    for i in range(1, 21):
        productor = uid(f"productor-{i}")
        lineas.append(
            "INSERT INTO productores (id, usuario_id, nombre, documento_identidad, telefono, organizacion) VALUES ("
            f"{sql_texto(productor)}, NULL, {sql_texto(f'Productor prueba {i:02d}')}, {sql_texto(f'VID{i:08d}')}, "
            f"{sql_texto(f'964000{i:03d}')}, {sql_texto('Cooperativa demo Chanchamayo')});"
        )
        for j in range(1, 3):
            n = (i - 1) * 2 + j
            parcela = uid(f"parcela-{n}")
            altitud = "NULL" if n == 3 else str(900 + (n * 37) % 900)
            localidad = "NULL" if n == 3 else sql_texto(DISTRITOS[(n - 1) % 7])
            if n == 1:
                altitud = "1600"
                localidad = sql_texto("La Merced")
            if n == 2:
                altitud = "1000"
                localidad = sql_texto("Pichanaqui")
            lineas.append(
                "INSERT INTO parcelas (id, productor_id, nombre, distrito, localidad, area_hectareas, altitud_msnm) VALUES ("
                f"{sql_texto(parcela)}, {sql_texto(productor)}, {sql_texto(f'Parcela prueba {n:02d}')}, "
                f"{sql_texto(DISTRITOS[(n - 1) % 7])}, {localidad}, {1 + (n % 5)}.{n % 10:01d}, {altitud});"
            )
            parcelas.append(parcela)

    eventos = 0
    por_etapa = {etapa: 0 for etapa in ["BENEFICIO", "TRILLA", "ALMACENAMIENTO", "TRASLADO", "EXPORTACION"]}
    completos = 0

    def agregar_evento(lote: str, etapa: str, fecha: str, descripcion: str, metodo: str | None = None, humedad: str | None = None) -> None:
        nonlocal eventos
        evento = uid(f"{lote}-{etapa}")
        lineas.append(
            "INSERT INTO eventos_trazabilidad (id, lote_id, etapa, fecha, descripcion) VALUES ("
            f"{sql_texto(evento)}, {sql_texto(lote)}, {sql_texto(etapa)}, DATE {sql_texto(fecha)}, {sql_texto(descripcion)});"
        )
        por_etapa[etapa] += 1
        eventos += 1
        if metodo and humedad:
            lineas.append(
                "INSERT INTO variables_productivas (id, evento_id, lote_id, metodo_beneficio, humedad_porcentaje) VALUES ("
                f"{sql_texto(uid(evento + '-var'))}, {sql_texto(evento)}, {sql_texto(lote)}, {sql_texto(metodo)}, {humedad});"
            )

    for n in range(1, 201):
        codigo = f"CHNY-2026-VID{n:05d}"
        lote = uid(codigo)
        parcela = parcelas[(n - 1) % 40]
        if n == 1:
            variedad, kg, cosecha = "Typica", "80.00", "2026-04-01"
        elif n == 2:
            variedad, kg, cosecha = "Pache", "60.00", "2026-05-01"
        elif n == 3:
            variedad, kg, cosecha = "Caturra", "40.00", "2026-03-15"
        else:
            variedad, kg, cosecha = VARIEDADES[n % 4], f"{50 + (n % 40)}.00", f"2026-03-{(n % 27) + 1:02d}"
        lineas.append(
            "INSERT INTO lotes (id, codigo, parcela_id, fecha_cosecha, cantidad_kg, variedad, observaciones, estado) VALUES ("
            f"{sql_texto(lote)}, {sql_texto(codigo)}, {sql_texto(parcela)}, DATE {sql_texto(cosecha)}, {kg}, "
            f"{sql_texto(variedad)}, {sql_texto('Lote de demostracion para la prueba')}, 'REGISTRADO');"
        )
        if n == 1:
            plan = [
                ("BENEFICIO", "2026-04-05", "Beneficio lavado del lote de demostracion", "Lavado", "11.00"),
                ("TRILLA", "2026-04-12", "Trilla del lote de demostracion", None, None),
                ("ALMACENAMIENTO", "2026-04-18", "Almacenamiento del lote de demostracion", None, None),
                ("TRASLADO", "2026-04-25", "Traslado del lote de demostracion", None, None),
                ("EXPORTACION", "2026-05-02", "Exportacion del lote de demostracion", None, None),
            ]
            completos += 1
        elif n == 2:
            plan = [
                ("BENEFICIO", "2026-05-01", "Beneficio natural del lote incompleto", "Natural", "12.50"),
                ("TRILLA", "2026-05-10", "Trilla del lote incompleto", None, None),
                ("ALMACENAMIENTO", "2026-05-18", "Almacenamiento del lote incompleto", None, None),
            ]
        elif n == 3:
            plan = []
        elif n <= 123:
            base = 10 + (n % 15)
            plan = [
                ("BENEFICIO", f"2026-04-{base:02d}", "Beneficio del lote de volumen", METODOS[n % 3], "11.00"),
                ("TRILLA", f"2026-04-{min(base + 4, 28):02d}", "Trilla del lote de volumen", None, None),
                ("ALMACENAMIENTO", f"2026-05-{(n % 20) + 1:02d}", "Almacenamiento del lote de volumen", None, None),
                ("TRASLADO", f"2026-05-{(n % 20) + 8:02d}", "Traslado del lote de volumen", None, None),
            ]
            if n <= 111:
                plan.append(("EXPORTACION", f"2026-06-{(n % 20) + 1:02d}", "Exportacion del lote de volumen", None, None))
            completos += 1
        elif n <= 173:
            plan = [
                ("BENEFICIO", f"2026-04-{(n % 20) + 1:02d}", "Beneficio sin traslado", METODOS[n % 3], "11.40"),
                ("TRILLA", f"2026-04-{(n % 20) + 6:02d}", "Trilla sin traslado", None, None),
                ("ALMACENAMIENTO", f"2026-05-{(n % 18) + 1:02d}", "Almacenamiento sin traslado", None, None),
            ]
        else:
            plan = [
                ("BENEFICIO", f"2026-04-{(n % 18) + 1:02d}", "Beneficio parcial", METODOS[n % 3], "10.80"),
                ("TRILLA", f"2026-04-{(n % 18) + 8:02d}", "Trilla parcial", None, None),
            ]
        for etapa, fecha, descripcion, metodo, humedad in plan:
            agregar_evento(lote, etapa, fecha, descripcion, metodo, humedad)

    lineas.append("COMMIT;")
    destino = Path(__file__).with_name("seed_prueba_800_eventos.sql")
    destino.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    if eventos != 800:
        raise SystemExit(f"eventos {eventos}, se esperaban 800")
    print("eventos", eventos)
    print("completos_previos", completos)
    print("por_etapa", por_etapa)
    print("VID00001", predecir([1, 1, 1, 1, 1, 0, 11, 20]))
    print("VID00002", predecir([1, 1, 1, 0, 1, 0, 12.5, 17]))
    print(destino)


if __name__ == "__main__":
    main()
