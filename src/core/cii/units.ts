// UN/ECE Recommendation 20 unit codes -> German label, for the subset
// realistically seen on construction invoices. Falls back to the raw code
// for anything not in the table -- an unrecognized unit code isn't an
// error, just something to display as-is.
const UNIT_LABELS: Record<string, string> = {
  C62: 'Stück',
  MTQ: 'm³',
  MTK: 'm²',
  MTR: 'm',
  KMT: 'km',
  TNE: 't',
  KGM: 'kg',
  GRM: 'g',
  LTR: 'l',
  HUR: 'h',
  DAY: 'Tag',
  MON: 'Monat',
  SET: 'Satz',
}

export function unitLabel(unitCode: string): string {
  return UNIT_LABELS[unitCode] ?? unitCode
}
