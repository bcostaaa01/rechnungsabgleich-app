// ISO 13616 shape + ISO 7064 MOD-97-10 checksum validation for IBANs. An
// IBAN is an identifier with a built-in check digit, not a monetary or
// quantity value parsed from the XML -- CLAUDE.md's Big-only-for-money rule
// (src/core/money.ts) doesn't apply here on purpose. The running remainder
// below never exceeds 969, so plain `number` carries no precision risk even
// though the numeric string it's derived from can be ~70 digits long.

// General shape only, not a per-country exact-length table: 34+ countries
// each with their own fixed BBAN length is real external data with a real
// maintenance surface. This regex enforces the one thing ISO 13616
// guarantees for every country -- 2-letter country code, 2 check digits,
// then 11-30 alphanumerics (15-34 chars total) -- and nothing more.
const IBAN_SHAPE = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/

function numericValue(char: string): string {
  if (char >= '0' && char <= '9') return char
  return String(char.charCodeAt(0) - 55) // A=10 .. Z=35
}

export function isValidIban(iban: string): boolean {
  if (!IBAN_SHAPE.test(iban)) return false

  const rearranged = iban.slice(4) + iban.slice(0, 4)

  let remainder = 0
  for (const char of rearranged) {
    for (const digit of numericValue(char)) {
      remainder = (remainder * 10 + Number(digit)) % 97
    }
  }

  return remainder === 1
}

// Groups into blocks of 4 the way IBANs are conventionally printed
// (`DE89 3704 0044 0532 0130 00`), for display only -- mirrors
// money.ts's formatEUR/formatQuantity being display-formatting siblings
// of the money logic they format. No length assumption: a trailing
// partial block (any length from 1-3) is left ungrouped rather than
// padded, consistent with this module's no-per-country-length-table
// stance.
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})(?=.)/g, '$1 ')
}
