export interface VariablesParaCalidad {
  variedad: string | null;
  altitudMsnm: number | null;
  metodoBeneficio: string | null;
  humedadPorcentaje: number | null;
}

export function ausenciasParaPrediccion(variables: VariablesParaCalidad): string[] {
  const ausentes: string[] = [];
  if (!variables.variedad?.trim()) {
    ausentes.push('variedad');
  }
  if (variables.altitudMsnm == null) {
    ausentes.push('altitud');
  }
  if (!variables.metodoBeneficio?.trim()) {
    ausentes.push('método de beneficio');
  }
  if (variables.humedadPorcentaje == null) {
    ausentes.push('humedad');
  }
  return ausentes;
}
