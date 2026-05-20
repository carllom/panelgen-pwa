import type { IDraw } from './IDraw'
import type { Vec3 } from './geometry'
import type { Tool } from './Tool'

export abstract class PanelComponent {
  pos: Vec3 = { x: 0, y: 0, z: 0 }

  abstract get extents(): Vec3
  abstract inside(x: number, y: number): boolean
}

export abstract class PanelStockItem extends PanelComponent {
  toolNumber = 0

  abstract draw(drw: IDraw): void
  abstract generateCode(tool: Tool): string
  abstract clone(): PanelStockItem

  usesTool(toolNumber: number): boolean { return toolNumber === this.toolNumber }
}
