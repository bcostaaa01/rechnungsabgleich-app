import { Fragment, useMemo, useState } from 'react'
import {
  parseCiiXml,
  runChecks,
  parseAmount,
  formatEUR,
  type Finding,
  type Invoice,
} from 'zugferd-validator'

import elektroNovak from './fixtures/elektro-novak.xml?raw'
import sanitaerHuber from './fixtures/sanitaer-huber.xml?raw'
import trockenbauWinter from './fixtures/trockenbau-winter.xml?raw'
import betonFischer from './fixtures/beton-fischer.xml?raw'
import geruestbauMeier from './fixtures/geruestbau-meier.xml?raw'

// Everything below runs entirely client-side, no backend -- same story as
// the main rechnungsabgleich app, just a different framework and a batch
// (not single-invoice) view. In a real intake system these five XML
// strings would come from wherever the GC's mail/PDF pipeline lands them
// (an inbox folder, an email attachment, an ERP webhook...); this demo
// bundles them as static fixtures so the scenario runs with zero setup.
const INBOX: { subcontractor: string; xml: string }[] = [
  { subcontractor: 'Elektro Novak GmbH', xml: elektroNovak },
  { subcontractor: 'Sanitär Huber KG', xml: sanitaerHuber },
  { subcontractor: 'Trockenbau Winter', xml: trockenbauWinter },
  { subcontractor: 'Beton Fischer GmbH', xml: betonFischer },
  { subcontractor: 'Gerüstbau Meier', xml: geruestbauMeier },
]

interface TriageRow {
  subcontractor: string
  invoice: Invoice
  findings: Finding[]
}

// SPEC.md's own default -- see the main app's src/stores/invoice.ts, kept
// consistent here rather than inventing a different tolerance value.
const TOLERANCE = parseAmount('0.01')!

function triageInbox(): TriageRow[] {
  return INBOX.map(({ subcontractor, xml }) => {
    const invoice = parseCiiXml(xml)
    const findings = runChecks(invoice, { tolerance: TOLERANCE })
    return { subcontractor, invoice, findings }
  })
}

export default function App() {
  const rows = useMemo(triageInbox, [])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const flaggedCount = rows.filter((row) => row.findings.length > 0).length

  return (
    <main>
      <header>
        <h1>Rechnungseingang — Baustelle Seestraße</h1>
        <p className="lede">
          {rows.length} Nachunternehmer-Rechnungen eingegangen, {flaggedCount}{' '}
          {flaggedCount === 1 ? 'benötigt' : 'benötigen'} manuelle Prüfung, bevor sie an die
          Buchhaltung weitergehen. Validiert client-seitig mit{' '}
          <a href="https://www.npmjs.com/package/zugferd-validator">zugferd-validator</a> — kein
          Backend, keine der fünf Rechnungen verlässt diesen Browser.
        </p>
      </header>

      <table>
        <thead>
          <tr>
            <th>Nachunternehmer</th>
            <th>Rechnungsnummer</th>
            <th className="num">Betrag</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = row.invoice.invoiceNumber
            const clean = row.findings.length === 0
            const isOpen = expandedKey === key

            return (
              <Fragment key={key}>
                <tr
                  className={clean ? undefined : 'flagged'}
                  onClick={clean ? undefined : () => setExpandedKey(isOpen ? null : key)}
                >
                  <td>{row.subcontractor}</td>
                  <td className="num">{key}</td>
                  <td className="num">{formatEUR(row.invoice.totals.grandTotal)}</td>
                  <td>
                    <span className={clean ? 'pill pill-clean' : 'pill pill-flagged'}>
                      {clean
                        ? 'Freigegeben'
                        : `${row.findings.length} Hinweis${row.findings.length > 1 ? 'e' : ''}`}
                    </span>
                  </td>
                </tr>
                {isOpen && !clean && (
                  <tr className="details">
                    <td colSpan={4}>
                      <ul>
                        {row.findings.map((finding) => (
                          <li key={finding.ruleId}>
                            <code>{finding.ruleId}</code> — {finding.messageDe}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </main>
  )
}
