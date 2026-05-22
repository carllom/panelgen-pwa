/**
 * Z-buffer (dexel) heightmap. The panel surface is at z=0; engraved areas have negative z.
 * GCode uses a panel-centred coordinate system: X ∈ [-panelW/2, +panelW/2],
 * Y ∈ [-panelH/2, +panelH/2].
 */
export class DexelHeightmap {
  readonly gridW: number   // columns (X axis)
  readonly gridH: number   // rows    (Y axis, row 0 = top = +Y)
  readonly pxPerMm: number
  readonly panelW: number
  readonly panelH: number
  /** Row-major Float32Array, all initialised to 0 (surface). Index = row * gridW + col. */
  readonly data: Float32Array

  constructor(panelW: number, panelH: number, pxPerMm = 2) {
    this.panelW = panelW
    this.panelH = panelH
    this.pxPerMm = pxPerMm
    this.gridW = Math.ceil(panelW * pxPerMm) + 1
    this.gridH = Math.ceil(panelH * pxPerMm) + 1
    this.data = new Float32Array(this.gridW * this.gridH) // 0.0 = surface
  }

  /** Flat-bottom cylindrical end mill: uniform depth within tool radius. */
  applyEndMill(x0: number, y0: number, x1: number, y1: number, z: number, toolRadiusMm: number): void {
    const radiusPx = toolRadiusMm * this.pxPerMm
    this._rasterize(x0, y0, x1, y1, (cx, cy) => {
      this._stamp(cx, cy, Math.ceil(radiusPx), (distPx) => {
        return distPx <= radiusPx ? z : null
      })
    })
  }

  /** Conical V-bit: depth tapers linearly from z at centre to 0 at the cone edge. */
  applyVBit(x0: number, y0: number, x1: number, y1: number, z: number, includedAngleDeg: number): void {
    const halfAngle = (includedAngleDeg / 2) * (Math.PI / 180)
    const tanHalf = Math.tan(halfAngle)
    // Cone radius at this depth: where depth reaches 0 (surface)
    const effectiveRadiusMm = Math.abs(z) * tanHalf
    const effectiveRadiusPx = effectiveRadiusMm * this.pxPerMm

    this._rasterize(x0, y0, x1, y1, (cx, cy) => {
      this._stamp(cx, cy, Math.ceil(effectiveRadiusPx), (distPx) => {
        const distMm = distPx / this.pxPerMm
        const depth = z + distMm / tanHalf   // negative at centre, rising to 0 at edge
        return depth < 0 ? depth : null
      })
    })
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private _rasterize(
    x0: number, y0: number, x1: number, y1: number,
    fn: (px: number, py: number) => void,
  ): void {
    const p0x = this._toCol(x0), p0y = this._toRow(y0)
    const p1x = this._toCol(x1), p1y = this._toRow(y1)
    const dx = p1x - p0x, dy = p1y - p0y
    const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) * 2)) // ½-pixel step
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      fn(Math.round(p0x + dx * t), Math.round(p0y + dy * t))
    }
  }

  private _stamp(cx: number, cy: number, rPx: number, depthFn: (distPx: number) => number | null): void {
    for (let dy = -rPx; dy <= rPx; dy++) {
      for (let dx = -rPx; dx <= rPx; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy)
        const depth = depthFn(dist)
        if (depth === null) continue
        const col = cx + dx, row = cy + dy
        if (col < 0 || col >= this.gridW || row < 0 || row >= this.gridH) continue
        const idx = row * this.gridW + col
        if (depth < this.data[idx]) this.data[idx] = depth
      }
    }
  }

  private _toCol(gcodeX: number): number {
    // GCode X=0 is the left edge of the panel
    return Math.round(gcodeX * this.pxPerMm)
  }

  private _toRow(gcodeY: number): number {
    // GCode Y=0 is the bottom edge (Y-up); row 0 is the top of the heightmap
    return Math.round((this.panelH - gcodeY) * this.pxPerMm)
  }
}
