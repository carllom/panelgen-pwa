import { describe, it, expect } from 'vitest'
import { CircularPocket } from '../CircularPocket'

function makeTool(diameter: number, zStep: number) {
  return { number: 1, diameter, zStep }
}

describe('CircularPocket.inside', () => {
  it('returns true for point inside circle', () => {
    const cp = new CircularPocket()
    cp.pos = { x: 0, y: 0, z: 0 }
    cp.diameter = 10
    expect(cp.inside(4, 0)).toBe(true)
    expect(cp.inside(0, 4)).toBe(true)
  })

  it('returns false for point outside circle', () => {
    const cp = new CircularPocket()
    cp.pos = { x: 0, y: 0, z: 0 }
    cp.diameter = 10
    expect(cp.inside(6, 0)).toBe(false)
  })
})

describe('CircularPocket.generateCode – too small for tool', () => {
  it('emits error comment when pocket smaller than tool', () => {
    const cp = new CircularPocket()
    cp.diameter = 2
    cp.depth = 3
    const code = cp.generateCode(makeTool(5, 1))
    expect(code).toContain('(ERROR: Pocket is too small for tool)')
  })
})

describe('CircularPocket.generateCode – helix path (small pocket)', () => {
  // Pocket: pos=(5,5,0), diameter=6, depth=3
  // Tool: diameter=5, zStep=1
  // maxRadius = 6/2 - 5/2 = 0.5
  // step.diameter(6) < tool.diameter*2(10) → helix method
  // z loop: -1, -2 (stop before -3); then final G02 at -3, then full circle
  let code: string
  let lines: string[]

  beforeEach(() => {
    const cp = new CircularPocket()
    cp.pos = { x: 5, y: 5, z: 0 }
    cp.diameter = 6
    cp.depth = 3
    code = cp.generateCode(makeTool(5, 1))
    lines = code.split('\n')
  })

  it('starts and ends with debug comments', () => {
    expect(lines[0]).toBe('(DEBUG: CircularPocket start)')
    expect(lines[lines.length - 1]).toBe('(DEBUG: CircularPocket end)')
  })

  it('moves to maxRadius start position', () => {
    expect(lines[1]).toBe('G00 X5.5 Y5')
  })

  it('sets feed rate', () => {
    expect(lines[2]).toBe('F75')
  })

  it('emits helix arcs for each z step', () => {
    expect(lines[3]).toBe('G02 I-0.5 X5.5 Y5 Z-1')
    expect(lines[4]).toBe('G02 I-0.5 X5.5 Y5 Z-2')
  })

  it('finishes with full-depth helix then full circle', () => {
    expect(lines[5]).toBe('G02 I-0.5 X5.5 Y5 Z-3')  // final helix
    expect(lines[6]).toBe('G02 I-0.5 X5.5 Y5')       // full circle
  })
})

describe('CircularPocket.generateCode – helix origin pocket (pos at 0,0)', () => {
  it('uses correct maxRadius when centered at origin', () => {
    const cp = new CircularPocket()
    cp.pos = { x: 0, y: 0, z: 0 }
    cp.diameter = 6
    cp.depth = 2
    const lines = cp.generateCode(makeTool(5, 1)).split('\n')
    expect(lines[1]).toBe('G00 X0.5 Y0')
    expect(lines[3]).toBe('G02 I-0.5 X0.5 Y0 Z-1')
    expect(lines[4]).toBe('G02 I-0.5 X0.5 Y0 Z-2')
    expect(lines[5]).toBe('G02 I-0.5 X0.5 Y0')
  })
})

describe('CircularPocket.clone', () => {
  it('produces independent copy', () => {
    const cp = new CircularPocket()
    cp.pos = { x: 1, y: 2, z: 0 }
    cp.diameter = 8
    cp.depth = 2
    const copy = cp.clone()
    copy.pos.x = 99
    expect(cp.pos.x).toBe(1)
  })
})
