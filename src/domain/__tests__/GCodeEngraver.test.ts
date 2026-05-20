import { describe, it, expect } from 'vitest'
import { GCodeEngraver, fmt } from '../GCodeEngraver'

describe('fmt', () => {
  it('no trailing zeros', () => expect(fmt(1.0)).toBe('1'))
  it('one decimal', () => expect(fmt(1.5)).toBe('1.5'))
  it('three decimals', () => expect(fmt(1.123)).toBe('1.123'))
  it('rounds to 3 places', () => expect(fmt(1.1236)).toBe('1.124'))
  it('negative', () => expect(fmt(-0.3)).toBe('-0.3'))
  it('fp noise is handled', () => expect(fmt(2 * (1 - 0.1))).toBe('1.8'))
})

describe('GCodeEngraver IDraw interface', () => {
  it('moveTo raises then moves', () => {
    const e = new GCodeEngraver()
    e.moveTo(5, 10)
    const lines = e.gCode().split('\n')
    expect(lines[0]).toBe('G0 Z1 F1500')  // raise from initial down state
    expect(lines[1]).toBe('G0 X5 Y10')
  })

  it('lineTo lowers then cuts', () => {
    const e = new GCodeEngraver()
    e.moveTo(0, 0)   // raises, moves
    e.lineTo(5, 5)   // lowers, G1
    const lines = e.gCode().split('\n')
    expect(lines[2]).toBe('G0 Z-0.3 F100')  // lower
    expect(lines[3]).toBe('G1 X5 Y5')
  })

  it('consecutive lineTo does not re-lower', () => {
    const e = new GCodeEngraver()
    e.moveTo(0, 0)
    e.lineTo(1, 0)
    e.lineTo(2, 0)
    const lines = e.gCode().split('\n')
    // After moveTo(0,0): raise, G0
    // After lineTo(1,0): lower, G1
    // After lineTo(2,0): already down, just G1
    expect(lines[4]).toBe('G1 X2 Y0')
  })

  it('moveTo between lineTos re-raises', () => {
    const e = new GCodeEngraver()
    e.moveTo(0, 0)
    e.lineTo(1, 0)
    e.moveTo(5, 5)
    const lines = e.gCode().split('\n')
    // lines: [0] raise [1] G0 0,0 [2] lower [3] G1 1,0 [4] raise [5] G0 5,5
    expect(lines[4]).toBe('G0 Z1 F1500')
    expect(lines[5]).toBe('G0 X5 Y5')
  })

  it('polyline via moveTo+lineTo', () => {
    const e = new GCodeEngraver()
    e.moveTo(0, 0)
    e.lineTo(10, 0)
    e.lineTo(10, 5)
    const code = e.gCode()
    expect(code).toContain('G1 X10 Y0')
    expect(code).toContain('G1 X10 Y5')
  })
})
