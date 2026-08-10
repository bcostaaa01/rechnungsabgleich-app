<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { rules } from '@/core/checks/rules'
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto max-w-2xl px-6 py-10 text-sm leading-relaxed">
      <h1 class="text-lg font-semibold text-ink">Über dieses Tool</h1>

      <p class="mt-4">
        Eine hybride E-Rechnung (ZUGFeRD/Factur-X) ist eine PDF-Datei, die zusätzlich eine
        maschinenlesbare XML-Datei mit denselben Rechnungsdaten enthält. Das PDF zeigt die
        Rechnung wie gewohnt an, während die eingebettete XML-Datei nach dem UN/CEFACT-CII-Standard
        strukturierte Daten für die automatische Weiterverarbeitung liefert – etwa für die
        Buchhaltungssoftware des Empfängers.
      </p>
      <p class="mt-3">
        Beide Darstellungen werden oft von unterschiedlichen Komponenten einer Rechnungssoftware
        erzeugt – oder nachträglich manuell angepasst. Rundungsfehler, veraltete Vorlagen oder Bugs
        in der Datengenerierung können dazu führen, dass die sichtbare Zahl auf dem PDF nicht mehr
        mit dem Wert in der XML-Datei übereinstimmt. Da Buchhaltungssysteme meist die XML-Daten
        verarbeiten, Menschen aber das PDF lesen, kann eine solche Abweichung unbemerkt bleiben –
        mit realen finanziellen Folgen.
      </p>

      <h2 class="mt-8 font-semibold text-ink">Was wird geprüft?</h2>
      <table class="mt-3 w-full text-left text-xs">
        <thead>
          <tr class="border-b border-border text-muted">
            <th class="py-1.5 pr-3 font-medium">Regel</th>
            <th class="py-1.5 pr-3 font-medium">Prüft</th>
            <th class="py-1.5 font-medium">EN 16931</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="rule in rules" :key="rule.id">
            <td class="num py-1.5 pr-3 align-top whitespace-nowrap">{{ rule.id }}</td>
            <td class="py-1.5 pr-3 align-top">{{ rule.descriptionDe }}</td>
            <td class="num py-1.5 align-top text-muted">{{ rule.businessRule ?? '—' }}</td>
          </tr>
        </tbody>
      </table>

      <h2 class="mt-8 font-semibold text-ink">Bekannte Einschränkungen</h2>
      <ul class="mt-3 list-disc space-y-1.5 pl-5">
        <li>
          Der Abgleich zwischen PDF-Text und XML-Werten (R-PDF-01/02) ist heuristisch: CII-Daten
          enthalten keine Koordinaten, daher wird nur nach dem Vorkommen der Zahl bzw.
          Rechnungsnummer im extrahierten PDF-Text gesucht.
        </li>
        <li>
          Zahlungsbedingungen (inkl. Skonto) werden derzeit nur als Freitext angezeigt, nicht
          strukturiert ausgewertet.
        </li>
        <li>
          Dieses Tool ersetzt keine vollständige EN-16931-Validierung. Für eine normkonforme
          Prüfung siehe den KoSIT-Validator unten.
        </li>
      </ul>

      <h2 class="mt-8 font-semibold text-ink">Offizielle Quellen</h2>
      <ul class="mt-3 space-y-1.5">
        <li>
          <a
            href="https://github.com/itplr-kosit/validator-configuration-xrechnung"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 hover:text-muted"
            >KoSIT XRechnung-Validator</a
          >
          – Schematron-basierte Referenzvalidierung
        </li>
        <li>
          <a
            href="https://www.ferd-net.de"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 hover:text-muted"
            >FeRD</a
          >
          – Forum elektronische Rechnung Deutschland, Herausgeber der ZUGFeRD-Spezifikation
        </li>
        <li>
          <a
            href="https://fnfe-mpe.org/factur-x/factur-x_en/"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 hover:text-muted"
            >FNFE-MPE</a
          >
          – Factur-X-Spezifikation
        </li>
        <li>
          <a
            href="https://github.com/ZUGFeRD/mustangproject"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 hover:text-muted"
            >Mustangproject</a
          >
          – Open-Source-Referenzimplementierung
        </li>
        <li>
          <a
            href="https://ec.europa.eu/digital-building-blocks/sites/spaces/DIGITAL/pages/467108950/EN+16931+compliance"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 hover:text-muted"
            >EN 16931</a
          >
          – Europäischer Standard für elektronische Rechnungen (Europäische Kommission)
        </li>
      </ul>

      <RouterLink
        to="/"
        class="mt-10 inline-block text-muted underline underline-offset-2 hover:text-ink"
      >
        ← Zurück
      </RouterLink>
    </div>
  </div>
</template>
