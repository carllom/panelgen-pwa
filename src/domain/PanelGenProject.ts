import { PanelStock } from './PanelStock'
import type { Tool } from './Tool'

export class PanelGenProject {
  stock = new PanelStock()
  tools: Tool[] = []

  generateGCode(): string {
    const lines: string[] = []
    for (const tool of this.tools) {
      // Matches C# Generate() + GenerateToolPath() structure (duplicate T/M06 is intentional).
      lines.push(`T${tool.number + 1}`, 'M06')
      lines.push(`T${tool.number + 1}`, 'M06')
      for (const item of this.stock.items) {
        if (item.usesTool(tool.number)) {
          const code = item.generateCode(tool)
          if (code) {
            lines.push(code)
            lines.push('G0 Z1 F1500')
          }
        }
      }
    }
    return lines.join('\n')
  }
}
