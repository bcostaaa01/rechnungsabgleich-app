import { describe, expect, it } from 'vitest'
import { unitLabel } from '../../src/cii/units.js'

describe('unitLabel', () => {
  it('maps known UN/ECE codes to German labels', () => {
    expect(unitLabel('MTQ')).toBe('m³')
    expect(unitLabel('TNE')).toBe('t')
    expect(unitLabel('C62')).toBe('Stück')
    expect(unitLabel('HUR')).toBe('h')
  })

  it('falls back to the raw code for an unrecognized unit', () => {
    expect(unitLabel('XYZ')).toBe('XYZ')
  })

  it('falls back to an empty string unchanged', () => {
    expect(unitLabel('')).toBe('')
  })
})
