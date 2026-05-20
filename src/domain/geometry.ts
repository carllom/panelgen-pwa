export interface Vec2 { x: number; y: number }
export interface Vec3 { x: number; y: number; z: number }

export function v2(x: number, y: number): Vec2 { return { x, y } }
export function v3(x: number, y: number, z = 0): Vec3 { return { x, y, z } }

export function v2Add(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y } }
export function v2Sub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y } }
export function v2Neg(v: Vec2): Vec2 { return { x: -v.x, y: -v.y } }
export function v2Scale(v: Vec2, s: number): Vec2 { return { x: v.x * s, y: v.y * s } }
export function v2Div(v: Vec2, s: number): Vec2 { return { x: v.x / s, y: v.y / s } }
export function v2Len(v: Vec2): number { return Math.sqrt(v.x * v.x + v.y * v.y) }
export function v2Normal(v: Vec2): Vec2 { return { x: -v.y, y: v.x } }
export function v2Normalize(v: Vec2): Vec2 { const l = v2Len(v); return v2Div(v, l) }
export function v2Rot(v: Vec2, rotate: boolean): Vec2 { return rotate ? { x: v.y, y: -v.x } : v }
export function v3Xy(v: Vec3): Vec2 { return { x: v.x, y: v.y } }
export function v3Sub(a: Vec3, b: Vec3): Vec3 { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z } }

export interface Segment2 { begin: Vec2; end: Vec2 }

export function seg2Normal(s: Segment2): Vec2 {
  return { x: s.begin.y - s.end.y, y: s.end.x - s.begin.x }
}

export function seg2Offset(s: Segment2, v: Vec2): Segment2 {
  return { begin: v2Add(s.begin, v), end: v2Add(s.end, v) }
}
