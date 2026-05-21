import type { PanelGenProject } from './PanelGenProject'
import type { PanelStock } from './PanelStock'
import type { PanelStockItem } from './PanelComponent'
import { CircularPocket } from './CircularPocket'
import { RectangularPocket } from './RectangularPocket'
import { PolyLine } from './PolyLine'
import { Dial } from './Dial'
import { Text, Alignment } from './Text'
import type { Tool } from './Tool'

function serializeItem(item: PanelStockItem): object | null {
  const base = {
    pos: { x: item.pos.x, y: item.pos.y, z: item.pos.z },
    toolNumber: item.toolNumber,
  }

  if (item instanceof CircularPocket) {
    return {
      type: 'CircularPocket', ...base,
      diameter: item.diameter,
      depth: item.depth,
      steps: item.steps.map(s => ({ diameter: s.diameter, depth: s.depth })),
    }
  }

  if (item instanceof RectangularPocket) {
    return {
      type: 'RectangularPocket', ...base,
      width: item.width,
      height: item.height,
      depth: item.depth,
    }
  }

  if (item instanceof PolyLine) {
    return {
      type: 'PolyLine', ...base,
      radius: item.radius,
      points: item.points.map(p => ({ x: p.x, y: p.y })),
    }
  }

  if (item instanceof Dial) {
    return {
      type: 'Dial', ...base,
      holeToolNumber: item.holeToolNumber,
      holeRadius: item.holeRadius,
      holeDepth: item.holeDepth,
      innerRadius: item.innerRadius,
      arcSpan: item.arcSpan,
      markerLength: item.markerLength,
      minValue: item.minValue,
      maxValue: item.maxValue,
      step: item.step,
      tickLength: item.tickLength,
      tickCount: item.tickCount,
      text: item.text,
      markerLabelOffset: item.markerLabelOffset,
      markerFontSize: item.markerFont.size,
      labelFontSize: item.labelFont.size,
    }
  }

  if (item instanceof Text) {
    return {
      type: 'Text', ...base,
      text: item.text,
      fontSize: item.font.size,
      anchor: item.anchor === Alignment.Left ? 'Left'
             : item.anchor === Alignment.Right ? 'Right'
             : 'Center',
    }
  }

  return null
}

export function serializeStock(stock: PanelStock): object {
  const items = stock.items.map(serializeItem).filter((x): x is object => x !== null)
  return {
    pos: { x: 0, y: 0, z: stock.pos.z },
    width: stock.width,
    height: stock.height,
    thickness: stock.thickness,
    items,
  }
}

export function saveProjectToJson(project: PanelGenProject, tools: Tool[]): string {
  const { stock } = project
  const doc = {
    version: '1.0',
    stock: serializeStock(stock),
    tools: tools.map(t => ({
      number: t.number,
      name: t.name,
      diameter: t.diameter,
      zStep: t.zStep,
      feedRate: t.feedRate,
      zFeedRate: t.zFeedRate,
      rpm: t.rpm,
    })),
  }
  return JSON.stringify(doc, null, 2)
}
