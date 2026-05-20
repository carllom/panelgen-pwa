import { describe, it, expect } from 'vitest'
import { RectangularPocket } from '../RectangularPocket'

function makeTool(diameter: number, zStep: number) {
  return { number: 1, diameter, zStep }
}

describe('RectangularPocket.inside', () => {
  it('returns true inside bounds', () => {
    const rp = new RectangularPocket()
    rp.pos = { x: 0, y: 0, z: 0 }
    rp.width = 10
    rp.height = 6
    expect(rp.inside(4, 2)).toBe(true)
  })

  it('returns false outside bounds', () => {
    const rp = new RectangularPocket()
    rp.pos = { x: 0, y: 0, z: 0 }
    rp.width = 10
    rp.height = 6
    expect(rp.inside(6, 0)).toBe(false)
  })
})

describe('RectangularPocket.generateCode – too small', () => {
  it('emits error when width < tool diameter', () => {
    const rp = new RectangularPocket()
    rp.width = 2
    rp.height = 10
    rp.depth = 3
    expect(rp.generateCode(makeTool(5, 1))).toContain('(ERROR: Pocket is too small for tool)')
  })
})

describe('RectangularPocket.generateCode – basic case', () => {
  // pos=(0,0,0), width=10, height=8, depth=2, tool diameter=2, zStep=1
  // toolOutline: w=8, h=6, left=-4, right=4, top=3, bottom=-3
  // toolSurface: w=6, h=4, left=-3, right=3, top=2, bottom=-2
  // step = 2*(1-0.1) = 1.8
  // Loop: z=-1 then z=-2

  let lines: string[]

  beforeEach(() => {
    const rp = new RectangularPocket()
    rp.pos = { x: 0, y: 0, z: 0 }
    rp.width = 10
    rp.height = 8
    rp.depth = 2
    lines = rp.generateCode(makeTool(2, 1)).split('\n')
  })

  it('starts and ends with debug comments', () => {
    expect(lines[0]).toBe('(DEBUG: RectangularPocket start)')
    expect(lines[lines.length - 1]).toBe('(DEBUG: RectangularPocket end)')
  })

  it('opens first plane at toolSurface bottom-left', () => {
    expect(lines[1]).toBe('G00 X-3 Y-2')
    expect(lines[2]).toBe('G01 Z-1')
  })

  it('snake fill sweeps right then up then left', () => {
    expect(lines[3]).toBe('G01 X3')      // first horizontal strip rightward
    expect(lines[4]).toBe('G01 Y-0.2')  // step up by 1.8 from -2
  })

  it('outline moves to toolOutline bottom-left then mills perimeter', () => {
    // After snake the code moves to toolOutline corner and mills the outline
    const outlineStart = lines.indexOf('G01 X-4 Y-3')
    expect(outlineStart).toBeGreaterThan(0)
    expect(lines[outlineStart + 1]).toBe('G01 Y3')
    expect(lines[outlineStart + 2]).toBe('G01 X4')
    expect(lines[outlineStart + 3]).toBe('G01 Y-3')
    expect(lines[outlineStart + 4]).toBe('G01 X-4')
  })

  it('second plane opens at z=-2', () => {
    // Find second G01 Z line
    const zLines = lines.flatMap((l, i) => l.startsWith('G01 Z') ? [{ l, i }] : [])
    expect(zLines.length).toBe(2)
    expect(zLines[1].l).toBe('G01 Z-2')
  })
})

describe('RectangularPocket.clone', () => {
  it('produces independent copy', () => {
    const rp = new RectangularPocket()
    rp.width = 20
    const copy = rp.clone()
    copy.width = 99
    expect(rp.width).toBe(20)
  })
})
