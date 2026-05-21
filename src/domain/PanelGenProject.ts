import { PanelStock } from './PanelStock'
import type { Tool } from './Tool'

export class PanelGenProject {
  stock = new PanelStock()
  tools: Tool[] = []

  generateGCode(tools?: Tool[]): string {
    const lines: string[] = []
    for (const tool of (tools ?? this.tools)) {
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

  generateGCodeByLayer(tools?: Tool[]): { tool: Tool; code: string }[] {
    const result: { tool: Tool; code: string }[] = []
    for (const tool of (tools ?? this.tools)) {
      const lines: string[] = []
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
      if (lines.length > 4) result.push({ tool, code: lines.join('\n') })
    }
    return result
  }
}
