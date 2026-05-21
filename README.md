# PanelGen

A browser-based CAD tool for designing CNC-machined front panels. Draw pockets, engravings, dials, text, and polylines on a panel stock, then export G-code ready for a CNC mill.

PanelGen is a Progressive Web App (PWA) — it runs entirely in the browser with no server required and can be installed as a desktop app. It is a TypeScript/Vue port of an earlier C#/.NET/GDI+ desktop application.

---

## Workspace layout

```
panelgen-pwa/
├── public/             Static assets (PWA manifest, icons)
├── scripts/            Build-time utilities (split-hershey.mjs — font pre-processing)
└── src/
    ├── App.vue         Root component: top bar, router outlet, toast
    ├── main.ts         App entry point (Vue + Pinia + Router setup)
    ├── router/         Vue Router — hash-based routes for each view
    ├── stores/
    │   └── appStore.ts Global Pinia store (project ref, tool library, UI settings)
    ├── domain/         Business logic — framework-free TypeScript classes
    ├── input/          User-input layer — tool handlers and keybindings
    ├── renderer/       Canvas rendering utilities
    ├── components/     Reusable Vue components
    ├── views/          Top-level page components (one per route)
    └── utils/          Small helpers (color conversion, etc.)
```

### Domain layer (`src/domain/`)

| File | Responsibility |
|---|---|
| `PanelComponent.ts` | Abstract base classes: `PanelComponent` (pos, extents, hit-test) and `PanelStockItem` (adds toolNumber, draw, generateCode, clone) |
| `PanelStock.ts` | The panel material rectangle — holds dimensions, thickness, and the ordered list of `PanelStockItem`s |
| `PanelGenProject.ts` | Top-level project: owns a `PanelStock` and a `Tool[]`; drives G-code generation by iterating tools and delegating to each item |
| `Tool.ts` | `Tool` interface (number, name, diameter, zStep, feedRate, zFeedRate, rpm) and `makeTool()` factory |
| `CircularPocket.ts` | Circular pocket item — supports plain pockets and multi-step counterbore profiles; mills with helix or outward spiral strategy depending on diameter |
| `RectangularPocket.ts` | Rectangular pocket item — adaptive spiral toolpath |
| `Dial.ts` | Rotary-dial engraving: arc markers, tick marks, numeric labels, and an optional centre hole |
| `Text.ts` | Single-line Hershey vector text with left/center/right alignment |
| `PolyLine.ts` | Open or closed polyline engraving with optional corner radius |
| `GCodeEngraver.ts` | `IDraw` implementation that generates G-code for lines; used by Text and PolyLine to convert vector geometry to mill moves |
| `IDraw.ts` | Minimal drawing interface (`moveTo`, `lineTo`) shared by all renderers |
| `ExtentsRenderer.ts` | `IDraw` implementation that computes the bounding box of any drawable item |
| `HersheyFont.ts` | Hershey single-stroke font renderer; fonts are pre-split into per-glyph JSON files at build time |
| `geometry.ts` | 2D/3D vector maths (`Vec2`, `Vec3`, add, sub, scale, normalize, dot, segment operations) |
| `projectLoader.ts` | Parses a PanelGen JSON file into a `PanelGenProject` (async — loads glyphs on demand) |
| `projectSaver.ts` | Serializes a `PanelGenProject` + tool library back to the same JSON format |
| `fontLoader.ts` | Lazy-loads Hershey glyph JSON chunks from `public/` |

### Input layer (`src/input/`)

| File | Responsibility |
|---|---|
| `ToolHandler.ts` | `ToolHandler` interface (pointer events, key events, drawOverlay) and `ToolContext` (viewport, store, helpers) |
| `keybindings.ts` | `KeyBinding` type and `dispatchKey()` dispatcher — skips events originating from form inputs |
| `tools/SelectTool.ts` | Click to select, drag to pan, drag selected item to move; click empty space to deselect |
| `tools/NodeEditTool.ts` | Edit individual vertices of a selected polyline |
| `tools/DialTool.ts` | Click to place a dial with default parameters |
| `tools/TextTool.ts` | Click to place a text element |
| `tools/CircularPocketTool.ts` | Click to place a circular pocket |
| `tools/RectangularPocketTool.ts` | Click to place a rectangular pocket |
| `tools/PolylineTool.ts` | Click to add vertices; double-click or Enter to commit; Escape to discard |
| `tools/snapUtils.ts` | Applies grid snap when `snapToGrid` is enabled |

### Renderer (`src/renderer/`)

| File | Responsibility |
|---|---|
| `Viewport.ts` | Manages the canvas transform (y-up world ↔ y-down screen); pan/zoom; world↔screen coordinate conversion |
| `CanvasDraw.ts` | `IDraw` implementation that forwards `moveTo`/`lineTo` to a `CanvasRenderingContext2D` path |

### Components (`src/components/`)

| File | Responsibility |
|---|---|
| `PanelCanvas.vue` | Main canvas: render loop, pointer/keyboard event dispatch, file load, viewport fit |
| `ToolSidebar.vue` | Vertical icon bar for switching the active tool |
| `PropertyEditor.vue` | Right-panel form showing properties of the selected item or panel stock |
| `CircularStepsEditor.vue` | Inline table editor for the counterbore steps of a circular pocket |
| `PointListEditor.vue` | Inline table editor for the vertex list of a polyline |
| `ToolSelect.vue` | `<select>` dropdown bound to a tool number; reads the global tool library for option labels |
| `ConfirmDialog.vue` | Modal delete-confirmation dialog with "always delete" option |
| `ToastNotification.vue` | Brief bottom-right save-confirmation toast |

### Views (`src/views/`)

| Route | View | Purpose |
|---|---|---|
| `/` | `PanelEditorView.vue` | Full editor: canvas + tool sidebar + property panel |
| `/tools` | `ToolsView.vue` | Manage the global CNC tool library |
| `/settings` | `SettingsView.vue` | App settings: editing preferences, new-panel defaults, canvas colors |
| `/gcode` | `GCodeExportView.vue` | Preview and download G-code for the current project |

---

## Application maintenance

### Prerequisites

- Node.js 18 or later
- npm

```
npm install
```

### Development server

```
npm run dev
```

Opens at `http://localhost:5173` with hot-module replacement.

### Type checking

```
npm run typecheck
```

Runs `vue-tsc --noEmit` across the entire project.

### Tests

```
npm test          # watch mode
npm run test:run  # single pass (CI)
```

Unit tests live in `src/domain/__tests__/` and use Vitest with happy-dom. They cover G-code generation, geometry, and rendering logic.

### Production build

```
npm run build
```

Type-checks then bundles to `dist/`. The output is a static PWA that can be served from any web server or file host.

### Preview production build

```
npm run preview
```

Serves `dist/` locally for final verification.

### Font pre-processing

Hershey font data is stored in `public/fonts/` as pre-split per-glyph JSON files. If the source font data changes, regenerate with:

```
npm run split-fonts
```

---

## Application use

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [+] [📂] [💾]   PanelGen   Editor | Tools | Settings | Export │  ← top bar
├────┬────────────────────────────────────────────┬───────────────┤
│    │                                            │               │
│ T  │                                            │  Property     │
│ o  │              Canvas                        │  Editor       │
│ o  │                                            │               │
│ l  │                                            │               │
│ s  │                                            │               │
│    │                                            │               │
└────┴────────────────────────────────────────────┴───────────────┘
```

The editor is the default view. The top bar contains file operation buttons and navigation links to the other views.

### Top bar buttons

| Button | Action |
|---|---|
| New (FilePlus) | Create a new empty project using the dimensions set in Settings |
| Load (FolderOpen) | Open a `.json` project file |
| Save (Save) | Save to the current file (uses File System Access API when available); shows a picker on first save; falls back to download in Firefox |

### Tool sidebar (keyboard shortcuts)

| Key | Tool | Description |
|---|---|---|
| `V` | Select | Click to select items, drag to move them, drag empty canvas to pan |
| `A` | Node edit | Edit individual vertices of a selected polyline |
| `D` | Dial | Click on canvas to place a rotary-dial engraving |
| `T` | Text | Click on canvas to place a single-line text engraving |
| `P` | Polyline | Click to lay down vertices; finish with double-click or `Enter` |
| `C` | Circular pocket | Click on canvas to place a circular pocket |
| `R` | Rect. pocket | Click on canvas to place a rectangular pocket |

Additional keyboard shortcuts:

| Key | Action |
|---|---|
| `Escape` | Return to Select tool (from any other tool) |
| `Enter` | Switch to Node edit when a polyline is selected in Select mode |
| `Delete` | Delete the selected item |
| `←` `→` `↑` `↓` | Nudge selected item 0.1 mm |
| `Shift` + arrows | Nudge by grid step (or 1.0 mm if grid is off) |
| `Ctrl` + arrows | Nudge 0.01 mm (fine) |

### Canvas navigation

| Input | Action |
|---|---|
| Scroll wheel | Zoom in / out (centred on cursor) |
| Drag on empty canvas (Select tool) | Pan |
| Click item | Select it |
| Click empty canvas | Deselect |

### Property editor

Shows the properties of the currently selected item. When nothing is selected in Select mode, shows the panel stock dimensions.

**Panel stock:** Width, Height, Thickness, Center X/Y

**All items:** X, Y position; Tool (dropdown from the global tool library)

**Circular pocket:** Diameter, Depth; counterbore Steps table (Diameter + Depth per step; add/remove rows)

**Rectangular pocket:** Width, Height, Depth

**Dial:** Inner radius, Arc span, Marker length, Min/Max value, Step, Tick length, Tick count, Label, Hole radius, Hole depth, Hole tool

**Text:** Content, Font size

**Polyline:** Vertex count; editable vertex table (X, Y per point; add/remove rows)

### Tools view (`/tools`)

Manages the global CNC tool library (persisted across sessions). Select a tool in the list on the left to edit it on the right.

Fields per tool: Number, Name, Diameter (mm), Z-Step (mm/pass), XY Feed (mm/min), Z Feed (mm/min), RPM.

Use **+ Add Tool** to create a new tool and **Delete** to remove the selected one. Tool numbers are referenced by panel items and appear in generated G-code as `T<n>` / `M06`.

When a project is loaded that contains embedded tool definitions and the global library is empty, the project's tools are imported automatically.

### Settings view (`/settings`)

**Editing**
- *Always delete without confirmation* — skip the delete dialog
- *Snap to grid* — constrain placement and movement to a regular grid; configure X and Y step in mm
- *Show origin axes* — draw X (red) and Y (green) axis lines through the panel origin

**New Panel Defaults**
- Default Width, Height, Thickness (mm) used when creating a new project

**Colors**
- Pocket color, Engraving color, Border color, Preview color with fill and outline opacity sliders

### G-code export view (`/gcode`)

Click **Export G-code** to generate and download `panel.nc`. G-code is generated per tool in tool-number order; each tool block starts with a `T<n>` / `M06` tool-change pair.

### Project file format

Projects are saved as `.json` files. The format stores the panel stock dimensions, all items with their properties, and the tool library. The coordinate origin (0, 0) is at the lower-left corner of the panel stock.
