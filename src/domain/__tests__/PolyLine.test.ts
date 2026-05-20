import { describe, it, expect } from 'vitest'
import { PolyLine } from '../PolyLine'
import type { IDraw } from '../IDraw'

describe('PolyLine.draw', () => {
  it('emits moveTo first point then lineTo remaining', () => {
    const calls: string[] = []
    const drw: IDraw = {
      moveTo: (x, y) => calls.push(`M${x},${y}`),
      lineTo: (x, y) => calls.push(`L${x},${y}`),
    }
    const pl = new PolyLine()
    pl.pos = { x: 1, y: 1, z: 0 }
    pl.points = [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 3 }]
    pl.draw(drw)
    expect(calls).toEqual(['M1,1', 'L6,1', 'L6,4'])
  })

  it('does nothing with fewer than 2 points', () => {
    const calls: string[] = []
    const drw: IDraw = {
      moveTo: () => calls.push('M'),
      lineTo: () => calls.push('L'),
    }
    const pl = new PolyLine()
    pl.points = [{ x: 0, y: 0 }]
    pl.draw(drw)
    expect(calls).toHaveLength(0)
  })

  it('generateCode produces G0/G1 G-code via GCodeEngraver', () => {
    const pl = new PolyLine()
    pl.pos = { x: 0, y: 0, z: 0 }
    pl.points = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    const tool = { number: 1, diameter: 2, zStep: 1 }
    const code = pl.generateCode(tool)
    expect(code).toContain('G0 X0 Y0')
    expect(code).toContain('G1 X10 Y0')
  })
})

describe('PolyLine.inside', () => {
  it('returns true for point near a segment', () => {
    const pl = new PolyLine()
    pl.pos = { x: 0, y: 0, z: 0 }
    pl.points = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    expect(pl.inside(5, 0)).toBe(true)
    expect(pl.inside(5, 1)).toBe(true) // within 1.5mm tolerance
  })

  it('returns false for point far from all segments', () => {
    const pl = new PolyLine()
    pl.pos = { x: 0, y: 0, z: 0 }
    pl.points = [{ x: 0, y: 0 }, { x: 10, y: 0 }]
    expect(pl.inside(5, 5)).toBe(false)
  })
})

describe('PolyLine.clone', () => {
  it('produces independent copy of points', () => {
    const pl = new PolyLine()
    pl.points = [{ x: 1, y: 2 }, { x: 3, y: 4 }]
    const copy = pl.clone()
    copy.points[0].x = 99
    expect(pl.points[0].x).toBe(1)
  })
})
