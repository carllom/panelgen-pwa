import { PanelComponent } from './PanelComponent'
import type { PanelStockItem } from './PanelComponent'
import type { Vec3 } from './geometry'
import { v2Sub } from './geometry'
import type { Guide } from './Guide'

export class PanelStock extends PanelComponent {
  width = 80
  height = 80
  thickness = 1
  items: PanelStockItem[] = []
  guides: Guide[] = []

  get extents(): Vec3 {
    return { x: this.width, y: this.height, z: this.thickness }
  }

  inside(x: number, y: number): boolean {
    const p = v2Sub({ x, y }, { x: this.pos.x, y: this.pos.y })
    return Math.abs(p.x) <= this.width / 2 && Math.abs(p.y) <= this.height / 2
  }
}
