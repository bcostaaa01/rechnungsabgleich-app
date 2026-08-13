import { describe, expect, it } from 'vitest'
import { formatIban, isValidIban } from '@/core/iban'

describe('isValidIban', () => {
  it('accepts the canonical German Bundesbank example', () => {
    expect(isValidIban('DE89370400440532013000')).toBe(true)
  })

  it('accepts a valid UK IBAN', () => {
    expect(isValidIban('GB29NWBK60161331926819')).toBe(true)
  })

  it('accepts a valid French IBAN', () => {
    expect(isValidIban('FR1420041010050500013M02606')).toBe(true)
  })

  it('rejects a German IBAN with a mutated checksum', () => {
    expect(isValidIban('DE89370400440532013099')).toBe(false)
  })

  it('accepts a shape-valid IBAN whose length is not the standard German 22 chars (no per-country length table)', () => {
    expect(isValidIban('DE03123456789012345')).toBe(true)
  })

  it('rejects a lowercase IBAN', () => {
    expect(isValidIban('de89370400440532013000')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidIban('')).toBe(false)
  })

  it('rejects a too-short string', () => {
    expect(isValidIban('DE1234')).toBe(false)
  })
})

describe('formatIban', () => {
  it('groups a 22-char German IBAN into blocks of 4 with a trailing 2-char block', () => {
    expect(formatIban('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00')
  })

  it('groups a 20-char Austrian-length IBAN evenly, no trailing space', () => {
    expect(formatIban('AT611904300234573201')).toBe('AT61 1904 3002 3457 3201')
  })

  it('leaves a trailing partial block ungrouped rather than padding it', () => {
    expect(formatIban('DE03123456789012345')).toBe('DE03 1234 5678 9012 345')
  })
})
