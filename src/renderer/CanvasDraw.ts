import type { IDraw } from '../domain/IDraw'

export class CanvasDraw implements IDraw {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  moveTo(x: number, y: number): void { this.ctx.moveTo(x, y) }
  lineTo(x: number, y: number): void { this.ctx.lineTo(x, y) }
}
