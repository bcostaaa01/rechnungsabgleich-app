import type { Korrekturblatt } from './korrekturblatt'

// Semicolon, not comma: German-locale Excel opens semicolon-delimited CSV
// directly without an import wizard, and every formatted amount already
// contains a comma as its decimal separator (formatEUR/formatQuantity),
// which would otherwise collide with the delimiter.
const DELIMITER = ';'

function escapeCsvField(value: string): string {
  if (value.includes(DELIMITER) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function row(fields: string[]): string {
  return fields.map(escapeCsvField).join(DELIMITER)
}

export function korrekturblattToCsv(blatt: Korrekturblatt): string {
  const metaRows = [
    row(['Rechnungsnummer', blatt.invoiceNumber]),
    row(['Lieferant', blatt.seller]),
    row(['Profil', blatt.profile]),
    row(['Rechnungsdatum', blatt.issueDate]),
    ...blatt.headerFindings.map((message) => row(['Prüfungshinweis (Kopf)', message])),
  ]

  const tableHeader = row([
    'Pos',
    'Bezeichnung',
    'Menge',
    'Einheit',
    'Einzelpreis',
    'Nettobetrag',
    'Status',
    'Notiz',
    'Prüfungshinweise',
  ])
  const tableRows = blatt.lines.map((line) =>
    row([
      line.lineId,
      line.name,
      line.quantity,
      line.unit,
      line.netUnitPrice,
      line.lineTotal,
      line.status,
      line.note,
      line.findings.join(' | '),
    ]),
  )

  return [...metaRows, '', tableHeader, ...tableRows].join('\r\n')
}
