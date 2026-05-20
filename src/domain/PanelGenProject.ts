import { PanelStock } from './PanelStock'
import type { Tool } from './Tool'

export class PanelGenProject {
  stock = new PanelStock()
  tools: Tool[] = []

  generateGCode(): string {
    const sections: string[] = []
    for (const tool of this.tools) {
      for (const item of this.stock.items) {
        if (item.usesTool(tool.number)) {
          const code = item.generateCode(tool)
          if (code) sections.push(code)
        }
      }
    }
    return sections.join('\n')
  }
}
