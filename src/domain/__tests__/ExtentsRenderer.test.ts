import { describe, it, expect } from 'vitest'
import { ExtentsRenderer } from '../ExtentsRenderer'

describe('ExtentsRenderer', () => {
  it('tracks min/max across moveTo and lineTo', () => {
    const xr = new ExtentsRenderer()
    xr.moveTo(1, 2)
    xr.lineTo(5, -3)
    xr.moveTo(-1, 4)
    expect(xr.minX).toBe(-1)
    expect(xr.maxX).toBe(5)
    expect(xr.minY).toBe(-3)
    expect(xr.maxY).toBe(4)
  })

  it('extents returns width/height', () => {
    const xr = new ExtentsRenderer()
    xr.moveTo(0, 0)
    xr.lineTo(10, 5)
    expect(xr.extents).toEqual({ x: 10, y: 5, z: 0 })
  })

  it('inside returns true for point within bounds', () => {
    const xr = new ExtentsRenderer()
    xr.moveTo(-5, -5)
    xr.lineTo(5, 5)
    expect(xr.inside(0, 0)).toBe(true)
    expect(xr.inside(5, 5)).toBe(true)
  })

  it('inside returns false for point outside bounds', () => {
    const xr = new ExtentsRenderer()
    xr.moveTo(0, 0)
    xr.lineTo(4, 4)
    expect(xr.inside(5, 2)).toBe(false)
    expect(xr.inside(2, 5)).toBe(false)
  })
})
