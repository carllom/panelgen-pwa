import { describe, it, expect } from 'vitest'
import {
  v2, v2Add, v2Sub, v2Neg, v2Scale, v2Div, v2Len, v2Normal, v2Normalize, v2Rot,
  v3, v3Xy, v3Sub,
  seg2Normal, seg2Offset,
} from '../geometry'

describe('Vec2 helpers', () => {
  it('v2Add', () => expect(v2Add(v2(1, 2), v2(3, 4))).toEqual({ x: 4, y: 6 }))
  it('v2Sub', () => expect(v2Sub(v2(5, 3), v2(2, 1))).toEqual({ x: 3, y: 2 }))
  it('v2Neg', () => expect(v2Neg(v2(1, -2))).toEqual({ x: -1, y: 2 }))
  it('v2Scale', () => expect(v2Scale(v2(2, 3), 4)).toEqual({ x: 8, y: 12 }))
  it('v2Div', () => expect(v2Div(v2(6, 4), 2)).toEqual({ x: 3, y: 2 }))
  it('v2Len', () => expect(v2Len(v2(3, 4))).toBeCloseTo(5))
  it('v2Normal', () => expect(v2Normal(v2(0, 1))).toEqual({ x: -1, y: 0 }))
  it('v2Normalize produces unit vector', () => {
    const n = v2Normalize(v2(3, 4))
    expect(v2Len(n)).toBeCloseTo(1)
  })
  it('v2Rot rotates when true', () => expect(v2Rot(v2(1, 0), true)).toEqual({ x: 0, y: -1 }))
  it('v2Rot is identity when false', () => expect(v2Rot(v2(1, 2), false)).toEqual({ x: 1, y: 2 }))
})

describe('Vec3 helpers', () => {
  it('v3 default z=0', () => expect(v3(1, 2)).toEqual({ x: 1, y: 2, z: 0 }))
  it('v3Xy strips z', () => expect(v3Xy(v3(1, 2, 3))).toEqual({ x: 1, y: 2 }))
  it('v3Sub', () => expect(v3Sub(v3(4, 5, 6), v3(1, 2, 3))).toEqual({ x: 3, y: 3, z: 3 }))
})

describe('Segment2 helpers', () => {
  it('seg2Normal for horizontal segment points up', () => {
    const s = { begin: v2(0, 0), end: v2(1, 0) }
    expect(seg2Normal(s)).toEqual({ x: 0, y: 1 })
  })

  it('seg2Offset shifts both endpoints', () => {
    const s = { begin: v2(0, 0), end: v2(2, 0) }
    const off = seg2Offset(s, v2(1, 1))
    expect(off).toEqual({ begin: { x: 1, y: 1 }, end: { x: 3, y: 1 } })
  })
})
