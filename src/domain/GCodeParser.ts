const X_RE = /X(-?[\d.]+)/i
const Y_RE = /Y(-?[\d.]+)/i
const Z_RE = /Z(-?[\d.]+)/i
const I_RE = /I(-?[\d.]+)/i
const J_RE = /J(-?[\d.]+)/i

function parseParam(re: RegExp, line: string): number | null {
  const m = line.match(re)
  return m ? parseFloat(m[1]) : null
}

export interface GCodeMove {
  fromX: number
  fromY: number
  fromZ: number
  x: number
  y: number
  z: number
  isLinear: boolean
}

/**
 * Tessellate a G02/G03 arc into linear segments.
 * All coordinates in the GCode plane (XY). Z is linearly interpolated for helical arcs.
 */
function tessellateArc(
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  I: number, J: number,
  clockwise: boolean,
): GCodeMove[] {
  const cx = x0 + I
  const cy = y0 + J
  const r  = Math.sqrt(I * I + J * J)

  let startAngle = Math.atan2(y0 - cy, x0 - cx)
  let endAngle   = Math.atan2(y1 - cy, x1 - cx)

  // Full circle: start and end at the same point
  const fullCircle = Math.hypot(x1 - x0, y1 - y0) < 1e-6
  let sweep: number
  if (fullCircle) {
    sweep = clockwise ? -2 * Math.PI : 2 * Math.PI
  } else {
    sweep = endAngle - startAngle
    if (clockwise  && sweep > 0) sweep -= 2 * Math.PI
    if (!clockwise && sweep < 0) sweep += 2 * Math.PI
  }

  // One segment per ~10° (36 per full circle minimum)
  const segs = Math.max(36, Math.ceil(Math.abs(sweep) / (Math.PI / 18)))
  const result: GCodeMove[] = []
  let px = x0, py = y0, pz = z0

  for (let i = 1; i <= segs; i++) {
    const t     = i / segs
    const angle = startAngle + sweep * t
    const nx    = cx + r * Math.cos(angle)
    const ny    = cy + r * Math.sin(angle)
    const nz    = z0 + (z1 - z0) * t
    result.push({ fromX: px, fromY: py, fromZ: pz, x: nx, y: ny, z: nz, isLinear: true })
    px = nx; py = ny; pz = nz
  }

  return result
}

/** Parse G0/G1/G2/G3 moves, tessellating arcs into linear segments. */
export function parseGCodeMoves(gcode: string): GCodeMove[] {
  let curX = 0, curY = 0, curZ = 1
  const moves: GCodeMove[] = []

  for (const raw of gcode.split('\n')) {
    const line = raw.trim().toUpperCase()
    if (!line) continue
    const gMatch = line.match(/^G0*(0|1|2|3)\b/)
    if (!gMatch) continue
    const gNum = parseInt(gMatch[1])

    if (gNum === 0 || gNum === 1) {
      const x = parseParam(X_RE, line) ?? curX
      const y = parseParam(Y_RE, line) ?? curY
      const z = parseParam(Z_RE, line) ?? curZ
      moves.push({ fromX: curX, fromY: curY, fromZ: curZ, x, y, z, isLinear: gNum === 1 })
      curX = x; curY = y; curZ = z

    } else {
      // G02 / G03 arc — tessellate into linear segments
      const endX = parseParam(X_RE, line) ?? curX
      const endY = parseParam(Y_RE, line) ?? curY
      const endZ = parseParam(Z_RE, line) ?? curZ
      const I    = parseParam(I_RE, line) ?? 0
      const J    = parseParam(J_RE, line) ?? 0

      const segs = tessellateArc(curX, curY, curZ, endX, endY, endZ, I, J, gNum === 2)
      moves.push(...segs)
      curX = endX; curY = endY; curZ = endZ
    }
  }

  return moves
}
