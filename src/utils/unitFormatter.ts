// src/utils/unitFormatter.ts
/**
 * Maps a base unit (e.g., KG, L) to the logistical unit used in inventory operations.
 * KG or L => 'UN' (unit/package/fardo). Other units => 'PCT'.
 */
const mapToLogisticUnit = (baseUnit?: string): string => {
  if (!baseUnit) return 'UN';
  const normalized = baseUnit.trim().toUpperCase();
  if (normalized === 'KG' || normalized === 'L') return 'UN';
  return 'PCT';
};

/**
 * Formats a numeric difference (stock divergence) with the appropriate logistical unit.
 * If the item has a packaging size (tamanhoEmbalagem), it is appended as a detail.
 * Example: diff = -5, baseUnit = 'KG', tamanhoEmbalagem = 5 => "-5 UN (5kg)"
 */
export const formatLogisticValue = (
  diff: number,
  baseUnit?: string,
  tamanhoEmbalagem?: number | null
): string => {
  const logisticUnit = mapToLogisticUnit(baseUnit);
  const detail =
    tamanhoEmbalagem && tamanhoEmbalagem > 0
      ? ` (${tamanhoEmbalagem}${baseUnit?.toLowerCase() ?? ''})`
      : '';
  return `${diff.toFixed(0)} ${logisticUnit}${detail}`;
};

/**
 * Helper for vencimento alerts – returns a textual cue for days to expiry.
 */
export const formatVencimentoLabel = (dias: number): string =>
  `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`;
