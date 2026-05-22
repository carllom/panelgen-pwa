export interface GCodeStats {
  engravingDistance: number       // mm — sum of all feed move lengths (G1/G01/G02/G03)
  travelDistance: number          // mm — sum of all rapid move lengths (G0/G00)
  estimatedEngravingTime: number  // seconds
  estimatedTravelTime: number     // seconds
  effectiveMinX: number
  effectiveMaxX: number
  effectiveMinY: number
  effectiveMaxY: number
  effectiveWidth: number          // effectiveMaxX - effectiveMinX
  effectiveHeight: number         // effectiveMaxY - effectiveMinY
}

const F_RE = /F([\d.]+)/
const X_RE = /X(-?[\d.]+)/
const Y_RE = /Y(-?[\d.]+)/
const I_RE = /I(-?[\d.]+)/
const J_RE = /J(-?[\d.]+)/

function parseCoord(re: RegExp, line: string, fallback: number): number {
  const m = line.match(re)
  return m ? parseFloat(m[1]) : fallback
}

// Arc length for G02/G03. Uses I/J offset to arc center; handles full-circle case.
function arcLength(curX: number, curY: number, endX: number, endY: number, I: number, J: number, cw: boolean): number {
  const r = Math.sqrt(I * I + J * J)
  if (r < 1e-9) return 0
  // Full circle when start and end coincide
  if (Math.abs(endX - curX) < 1e-6 && Math.abs(endY - curY) < 1e-6) {
    return 2 * Math.PI * r
  }
  const cx = curX + I
  const cy = curY + J
  let angle = Math.atan2(endY - cy, endX - cx) - Math.atan2(curY - cy, curX - cx)
  if (cw) { if (angle > 0) angle -= 2 * Math.PI }
  else     { if (angle < 0) angle += 2 * Math.PI }
  return r * Math.abs(angle)
}

export class GCodeStatistics {
  static analyze(gcode: string): GCodeStats {
    let curX = 0, curY = 0, curF = 100

    let engravingDistance = 0
    let travelDistance = 0
    let engravingTime = 0
    let travelTime = 0

    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity

    for (const raw of gcode.split('\n')) {
      const line = raw.trim()
      if (!line) continue
      const upper = line.toUpperCase()

      // Standalone F word (e.g. "F75") — just update feedrate
      if (/^F[\d.]+$/.test(upper)) {
        curF = parseFloat(upper.slice(1))
        continue
      }

      const fMatch = upper.match(F_RE)
      if (fMatch) curF = parseFloat(fMatch[1])

      // Normalise G-word: G0/G00 → 0, G1/G01 → 1, G02/G2 → 2, G03/G3 → 3
      const gMatch = upper.match(/^G0*([0-3])\b/)
      if (!gMatch) continue
      const gCode = parseInt(gMatch[1])

      const hasX = upper.includes('X')
      const hasY = upper.includes('Y')

      if (gCode === 0) {
        // Rapid — skip Z-only moves
        if (!hasX && !hasY) continue
        const newX = parseCoord(X_RE, upper, curX)
        const newY = parseCoord(Y_RE, upper, curY)
        const dx = newX - curX, dy = newY - curY
        const dist = Math.sqrt(dx * dx + dy * dy)
        travelDistance += dist
        if (curF > 0) travelTime += (dist / curF) * 60
        curX = newX; curY = newY

      } else if (gCode === 1) {
        // Linear feed — skip Z-only moves
        if (!hasX && !hasY) continue
        const newX = parseCoord(X_RE, upper, curX)
        const newY = parseCoord(Y_RE, upper, curY)
        const dx = newX - curX, dy = newY - curY
        const dist = Math.sqrt(dx * dx + dy * dy)
        engravingDistance += dist
        if (curF > 0) engravingTime += (dist / curF) * 60
        minX = Math.min(minX, curX, newX); maxX = Math.max(maxX, curX, newX)
        minY = Math.min(minY, curY, newY); maxY = Math.max(maxY, curY, newY)
        curX = newX; curY = newY

      } else if (gCode === 2 || gCode === 3) {
        // Arc feed (G02 = CW, G03 = CCW)
        const newX = parseCoord(X_RE, upper, curX)
        const newY = parseCoord(Y_RE, upper, curY)
        const I = parseCoord(I_RE, upper, 0)
        const J = parseCoord(J_RE, upper, 0)
        const dist = arcLength(curX, curY, newX, newY, I, J, gCode === 2)
        engravingDistance += dist
        if (curF > 0) engravingTime += (dist / curF) * 60
        // Bounding box: approximate with start and end (arc bulge ignored — acceptable for stats)
        minX = Math.min(minX, curX, newX); maxX = Math.max(maxX, curX, newX)
        minY = Math.min(minY, curY, newY); maxY = Math.max(maxY, curY, newY)
        curX = newX; curY = newY
      }
    }

    const hasEngraving = minX !== Infinity

    return {
      engravingDistance,
      travelDistance,
      estimatedEngravingTime: engravingTime,
      estimatedTravelTime: travelTime,
      effectiveMinX: hasEngraving ? minX : 0,
      effectiveMaxX: hasEngraving ? maxX : 0,
      effectiveMinY: hasEngraving ? minY : 0,
      effectiveMaxY: hasEngraving ? maxY : 0,
      effectiveWidth: hasEngraving ? maxX - minX : 0,
      effectiveHeight: hasEngraving ? maxY - minY : 0,
    }
  }
}
