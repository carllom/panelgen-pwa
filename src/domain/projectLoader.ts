import { PanelGenProject } from './PanelGenProject'
import { PanelStock } from './PanelStock'
import { Guide } from './Guide'
import type { PanelStockItem } from './PanelComponent'
import { CircularPocket } from './CircularPocket'
import { RectangularPocket } from './RectangularPocket'
import { PolyLine } from './PolyLine'
import { Dial } from './Dial'
import { Text, Alignment } from './Text'
import { loadFaceGlyphs } from './fontLoader'
import { FontFace, HersheyFont } from './HersheyFont'

// ─── JSON schema ──────────────────────────────────────────────────────────────

interface JPos { x: number; y: number; z: number }
interface JItemBase { type: string; pos: JPos; toolNumber: number }

interface JCircularPocket extends JItemBase {
  type: 'CircularPocket'; diameter: number; depth: number
  steps: { diameter: number; depth: number }[]
}
interface JRectangularPocket extends JItemBase {
  type: 'RectangularPocket'; width: number; height: number; depth: number
}
interface JPolyLine extends JItemBase {
  type: 'PolyLine'; radius: number; points: { x: number; y: number }[]
}
interface JDial extends JItemBase {
  type: 'Dial'
  holeToolNumber: number; holeRadius: number; holeDepth: number
  innerRadius: number; arcSpan: number; markerLength: number
  minValue: number; maxValue: number; step: number
  tickLength: number; tickCount: number; text: string
  markerLabelOffset: number; markerFontSize: number; labelFontSize: number
  labelFontFace?: string
}
interface JText extends JItemBase {
  type: 'Text'; text: string; fontSize: number; anchor: string; fontFace?: string
}
interface JTool {
  number: number; diameter: number; zStep: number
  name?: string; feedRate?: number; zFeedRate?: number; rpm?: number
}

interface JGuide { direction: string; pos: number }

interface JProject {
  stock: { pos: JPos; width: number; height: number; thickness: number; items: JItemBase[]; guides?: JGuide[] }
  tools: JTool[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseFontFace(name?: string): FontFace {
  if (name && name in FontFace) return FontFace[name as keyof typeof FontFace] as unknown as FontFace
  return FontFace.RomanSimplex
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function loadStockFromRaw(js: { pos: JPos; width: number; height: number; thickness: number; items: JItemBase[]; guides?: JGuide[] }): Promise<PanelStock> {
  const stock = new PanelStock()
  stock.pos = { x: js.width / 2, y: js.height / 2, z: js.pos.z }
  stock.width = js.width
  stock.height = js.height
  stock.thickness = js.thickness
  const items = await Promise.all(js.items.map(buildItem))
  for (const item of items) if (item) stock.items.push(item)
  for (const jg of js.guides ?? []) {
    const guide = new Guide()
    guide.direction = jg.direction === 'vertical' ? 'vertical' : 'horizontal'
    guide.pos = jg.pos
    stock.guides.push(guide)
  }
  return stock
}

/**
 * Parse a PanelGen JSON project (v1.0) into a PanelGenProject ready for
 * rendering and G-code generation.
 *
 * The JSON coordinate system has its origin at the panel's bottom-left corner.
 * stock.pos is set to (width/2, height/2) so the panel border drawn at
 * pos ± size/2 correctly encloses all items.
 */
export async function loadProjectFromJson(raw: unknown): Promise<PanelGenProject> {
  const data = raw as JProject
  const js = data.stock

  const stock = await loadStockFromRaw(js)

  const project = new PanelGenProject()
  project.stock = stock
  project.tools = data.tools.map(t => ({
    number: t.number,
    name: t.name ?? '',
    diameter: t.diameter,
    zStep: t.zStep,
    feedRate: t.feedRate ?? 800,
    zFeedRate: t.zFeedRate ?? 300,
    rpm: t.rpm ?? 10000,
  }))
  return project
}

// ─── Item builder ─────────────────────────────────────────────────────────────

async function buildItem(raw: JItemBase): Promise<PanelStockItem | null> {
  switch (raw.type) {
    case 'CircularPocket': {
      const j = raw as JCircularPocket
      const item = new CircularPocket()
      item.pos = { ...raw.pos }
      item.toolNumber = raw.toolNumber
      item.diameter = j.diameter
      item.depth = j.depth
      item.steps = j.steps.map(s => ({ diameter: s.diameter, depth: s.depth }))
      return item
    }
    case 'RectangularPocket': {
      const j = raw as JRectangularPocket
      const item = new RectangularPocket()
      item.pos = { ...raw.pos }
      item.toolNumber = raw.toolNumber
      item.width = j.width
      item.height = j.height
      item.depth = j.depth
      return item
    }
    case 'PolyLine': {
      const j = raw as JPolyLine
      const item = new PolyLine()
      item.pos = { ...raw.pos }
      item.toolNumber = raw.toolNumber
      item.radius = j.radius
      item.points = j.points.map(p => ({ x: p.x, y: p.y }))
      return item
    }
    case 'Dial': {
      const j = raw as JDial
      const labelFace = parseFontFace(j.labelFontFace)
      const [defaultGlyphs, labelGlyphs] = await Promise.all([
        loadFaceGlyphs(FontFace.RomanSimplex),
        loadFaceGlyphs(labelFace),
      ])
      const item = new Dial(defaultGlyphs)
      item.pos = { ...raw.pos }
      item.toolNumber = raw.toolNumber
      item.holeToolNumber = j.holeToolNumber
      item.holeRadius = j.holeRadius
      item.holeDepth = j.holeDepth
      item.innerRadius = j.innerRadius
      item.arcSpan = j.arcSpan
      item.markerLength = j.markerLength
      item.minValue = j.minValue
      item.maxValue = j.maxValue
      item.step = j.step
      item.tickLength = j.tickLength
      item.tickCount = j.tickCount
      item.text = j.text
      item.markerLabelOffset = j.markerLabelOffset
      item.markerFont.size = j.markerFontSize
      item.labelFontFace = labelFace
      item.labelFont = new HersheyFont(labelFace, labelGlyphs, j.labelFontSize)
      return item
    }
    case 'Text': {
      const j = raw as JText
      const face = parseFontFace(j.fontFace)
      const glyphs = await loadFaceGlyphs(face)
      const item = new Text(j.text, glyphs, face)
      item.pos = { ...raw.pos }
      item.toolNumber = raw.toolNumber
      item.font.size = j.fontSize
      item.anchor = j.anchor === 'Left' ? Alignment.Left
                  : j.anchor === 'Right' ? Alignment.Right
                  : Alignment.Center
      return item
    }
    default:
      return null
  }
}
