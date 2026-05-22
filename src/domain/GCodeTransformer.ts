import { fmt } from './GCodeEngraver'

const X_RE = /X(-?[\d.]+)/
const Y_RE = /Y(-?[\d.]+)/
const Z_RE = /Z(-?[\d.]+)/
const I_RE = /I(-?[\d.]+)/
const J_RE = /J(-?[\d.]+)/
const F_RE = /F([\d.]+)/

function parse(re: RegExp, line: string): number | null {
  const m = line.match(re)
  return m ? parseFloat(m[1]) : null
}

/**
 * Rotate the GCode in-place by `angleDeg` degrees around the panel centre (0,0),
 * then translate so the nearest bounding-box corner lands at the machine origin.
 *
 * All linear moves (G0/G00/G1/G01) have their XY coordinates transformed.
 * Arc moves (G02/G03) have their XY end point transformed and their IJ centre
 * offset recomputed from the rotated centre — the arc radius is unchanged.
 * Z values and all non-motion lines pass through untouched.
 */
export function transformGCode(
  gcode: string,
  angleDeg: number,
  panelWidth: number,
  panelHeight: number,
): string {
  if (angleDeg === 0) return gcode

  const angle = (angleDeg * Math.PI) / 180
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)

  function rot(x: number, y: number): [number, number] {
    return [x * ca - y * sa, x * sa + y * ca]
  }

  // Translation: rotate panel corners, find the min bounding-box corner
  const hw = panelWidth / 2
  const hh = panelHeight / 2
  const corners: [number, number][] = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]]
  const rotCorners = corners.map(([x, y]) => rot(x, y))
  const tx = -Math.min(...rotCorners.map(p => p[0]))
  const ty = -Math.min(...rotCorners.map(p => p[1]))

  let curX = 0
  let curY = 0
  const out: string[] = []

  for (const raw of gcode.split('\n')) {
    const line = raw.trim()
    if (!line) { out.push(''); continue }
    const upper = line.toUpperCase()

    const gMatch = upper.match(/^G0*([0-3])\b/)
    if (!gMatch) { out.push(line); continue }
    const gNum = parseInt(gMatch[1])

    if (gNum === 0 || gNum === 1) {
      const xVal = parse(X_RE, upper)
      const yVal = parse(Y_RE, upper)
      const zVal = parse(Z_RE, upper)
      const fVal = parse(F_RE, upper)

      // Z-only move: pass through
      if (xVal === null && yVal === null) { out.push(line); continue }

      const origX = xVal ?? curX
      const origY = yVal ?? curY
      const [rx, ry] = rot(origX, origY)

      let l = `G${gNum} X${fmt(rx + tx)} Y${fmt(ry + ty)}`
      if (zVal !== null) l += ` Z${fmt(zVal)}`
      if (fVal !== null) l += ` F${fmt(fVal)}`
      out.push(l)

      curX = origX
      curY = origY

    } else {
      // G2 / G3 arc — reposition centre and endpoint, keep radius
      const origX = parse(X_RE, upper) ?? curX
      const origY = parse(Y_RE, upper) ?? curY
      const zVal  = parse(Z_RE, upper)
      const fVal  = parse(F_RE, upper)
      const I = parse(I_RE, upper) ?? 0
      const J = parse(J_RE, upper) ?? 0

      // Centre in original coordinates; rotate start and centre, derive new IJ
      const cOrigX = curX + I
      const cOrigY = curY + J
      const [rEndX, rEndY]  = rot(origX, origY)
      const [rStartX, rStartY] = rot(curX, curY)
      const [rCenX, rCenY]  = rot(cOrigX, cOrigY)

      const newI = rCenX - rStartX
      const newJ = rCenY - rStartY

      let l = `G0${gNum} X${fmt(rEndX + tx)} Y${fmt(rEndY + ty)} I${fmt(newI)} J${fmt(newJ)}`
      if (zVal !== null) l += ` Z${fmt(zVal)}`
      if (fVal !== null) l += ` F${fmt(fVal)}`
      out.push(l)

      curX = origX
      curY = origY
    }
  }

  return out.join('\n')
}
