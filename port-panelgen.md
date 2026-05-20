# PanelGen: Web Port Feasibility Assessment

**Date:** 2026-05-19  
**Scope:** Porting the PanelGen .NET/WinForms desktop application to a TypeScript + Vue progressive web app.

---

## Summary Verdict

**Feasibility: High. Recommended.**

The codebase is ~3,600 LOC of well-factored C# with a clean domain/UI split. The core domain model (`PanelGen.Cli`) has zero UI dependencies and maps almost mechanically to TypeScript. The `IDraw` interface — the central abstraction for both rendering and G-code generation — ports directly. The performance bottleneck in the current app is a solvable architectural problem, not an inherent limitation, and a web port is a natural opportunity to fix it properly.

---

## Current Architecture Snapshot

The solution has three projects:

| Project | Role | LOC |
| --- | --- | --- |
| `PanelGen.Cli` | Domain model + G-code generation | ~1,700 |
| `PanelGen.Display` | WinForms UI + GDI+ rendering | ~1,800 |
| `Gcode` | Stub library | minimal |

The key insight for portability is that `PanelGen.Cli` is entirely free of UI and platform references. All geometry, G-code generation, and component logic lives there. The `IDraw` interface is the seam:

```csharp
interface IDraw {
    void MoveTo(float x, float y);
    void LineTo(float x, float y);
}
```

Both screen rendering (`ScreenDraw` via GDI+) and G-code export (`GCodeEngraver`) implement this. A browser port adds a third implementation — `CanvasDraw` or `SvgDraw` — without touching the components.

---

## Rendering Technology Comparison

### Option 1: SVG

SVG represents each drawing element as a DOM node, queryable and styleable with CSS.

**Advantages:**

- Easiest to implement: map each `MoveTo`/`LineTo` to `<path>` elements
- Hit testing is free (DOM events on elements)
- Crisp at any zoom level (vector)
- Accessible (ARIA, screen readers)

**Disadvantages:**

- **Worst performance of the three for this use case.** Complex panels with many tick marks, text strokes, and pocket outlines create thousands of DOM nodes. Pan/zoom operations force the browser layout engine to recompute geometry for every node. This is worse than GDI+, not better.
- Difficult to batch or cull off-screen geometry

**Verdict:** Good for simple panels or a static preview thumbnail. Not suitable as the primary canvas for editing.

---

### Option 2: HTML5 Canvas 2D

Canvas is an immediate-mode raster API. You draw by calling commands (`moveTo`, `lineTo`, `stroke`), and the result is pixels — no retained structure.

**Advantages:**

- Direct equivalent of GDI+: `ScreenDraw` ports almost line-for-line
- Excellent performance for 2D wireframe when viewport culling is applied
- No DOM overhead — a thousand line segments costs the same as ten
- Simple coordinate transforms: `ctx.setTransform(scale, 0, 0, -scale, originX, originY)` handles the model-to-screen mapping in one call
- `requestAnimationFrame` gives smooth 60fps panning/zooming with minimal code

**Disadvantages:**

- No built-in hit testing (must implement manually, same as current C# code)
- Raster: looks slightly soft at non-integer zoom levels (mitigated with `devicePixelRatio` scaling)

**Verdict:** Best fit for this application. Matches the existing architecture most closely and solves the performance problem with straightforward techniques.

---

### Option 3: WebGL / WebGPU

GPU-accelerated rendering, typically via libraries like PixiJS or Three.js (2D mode), or raw WebGL.

**Advantages:**

- Handles hundreds of thousands of line segments at 60fps
- GPU-accelerated zoom/pan with zero CPU cost

**Disadvantages:**

- Significant implementation complexity
- Line rendering on GPU requires custom shaders or a capable library (WebGL has no native thick-line primitive)
- Overkill: a fully loaded panel with Hershey text, dials, and pockets generates perhaps 5,000–20,000 line segments. Canvas 2D handles this comfortably.

**Verdict:** Not warranted unless the application expands dramatically in scope (e.g., rendering full G-code toolpaths with hundreds of thousands of arcs). Consider only if Canvas 2D profiling shows a bottleneck after culling is implemented.

---

## The Performance Problem (and the Fix)

The current slow-down is caused by unconditional full redraws: every `OnPaint` call iterates all components and redraws all geometry, even elements outside the visible viewport. This is the GDI+ equivalent of layout thrash.

The fix in Canvas 2D is a combination of two techniques:

**1. Viewport culling**  
Before calling `item.Draw()`, check the item's bounding box (already available via `ExtentsRenderer`) against the canvas viewport rectangle. Skip items that don't intersect. For a typical panel this eliminates 70–90% of draw calls during zoom.

**2. Transform-level pan/zoom**  
Instead of recalculating every coordinate on pan/zoom (the current approach via `ScreenX`/`ScreenY` helpers), maintain the pan/zoom as a transform matrix applied once per frame via `ctx.setTransform`. All geometry is stored in model coordinates; the transform is applied at draw time. Panning becomes a single matrix update + frame repaint with the same geometry — no per-vertex math.

```typescript
// Once per frame, before drawing:
ctx.setTransform(zoom, 0, 0, -zoom, originX, originY);
ctx.beginPath();
for (const item of visibleItems) item.draw(canvasDraw);
ctx.stroke();
```

**Optional: Object-level dirty flags**  
Mark a component dirty only when its properties change. On repaint, only redraw dirty components into an offscreen canvas, then blit the composite. More complex, but allows smooth 60fps even on very heavy panels.

A simple viewport cull + single-transform approach will likely be sufficient.

---

## Technology Stack Recommendation

| Layer | Recommendation | Rationale |
| --- | --- | --- |
| Language | TypeScript | Near-mandatory for a typed domain model port |
| UI framework | Vue 3 (Composition API) | Reactive state fits the component property model; Pinia for project state |
| Rendering | HTML5 Canvas 2D | Direct GDI+ equivalent, best fit for the IDraw abstraction |
| Build | Vite | Fast HMR, native ESM, minimal config |
| State | Pinia | Lightweight, TypeScript-native, replaces `PanelGenApplication` state |
| File I/O | File System Access API | Read/write local files natively (Chrome/Edge); JSON format |
| G-code download | Blob + `<a download>` | Simple, no server needed |

**WebAssembly:** Not needed. The domain logic is not CPU-intensive. The slow rendering was a draw-call architecture issue, not a computation issue. WASM would add build complexity with no measurable benefit.

---

## Architecture Mapping

### Domain Model — Trivial Port

`PanelGen.Cli` classes map directly to TypeScript. The `IDraw` interface becomes:

```typescript
interface IDraw {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
}

abstract class PanelStockItem {
  abstract draw(ctx: IDraw): void;
  abstract inside(x: number, y: number): boolean;
  abstract get extents(): Rect;
}
```

`GCodeEngraver` is a pure string-builder with no UI dependencies — it ports verbatim.

### Rendering — Easy Port

`ScreenDraw` becomes `CanvasDraw`, about 15 lines:

```typescript
class CanvasDraw implements IDraw {
  constructor(private ctx: CanvasRenderingContext2D) {}
  moveTo(x: number, y: number) { this.ctx.moveTo(x, y); }
  lineTo(x: number, y: number) { this.ctx.lineTo(x, y); }
}
```

The coordinate transform moves out of `ScreenDraw` and into the canvas frame setup (see above). This alone fixes the pan/zoom performance.

### UI — Medium Effort

The 7 settings dialogs (one per component type) are the most labor-intensive part. They currently duplicate structure per component. In Vue, each becomes a form component bound to a Pinia store slice. The opportunity is to unify them under a property-panel pattern — a single sidebar component, different fields per selected item type — rather than modal dialogs.

`ViewPanel` (pan/zoom/select canvas control) becomes a Vue component wrapping `<canvas>` with `pointerdown`, `pointermove`, and `wheel` listeners.

### Serialization

The binary format can be abandoned in favor of JSON. The save/load logic is straightforward and the binary format has no compatibility obligations worth preserving for a full rewrite. JSON is human-readable, debuggable, and future-compatible. A small one-time converter (TypeScript CLI or C# utility) can migrate existing `.panelgen` files.

---

## Estimated Effort

| Area | Effort | Notes |
| --- | --- | --- |
| TypeScript domain model | 2–3 days | Near-mechanical translation of Cli project |
| G-code generation | 1 day | Pure logic, circular pocket math included |
| Hershey font rendering | 1 day | Font data files need JSON conversion; logic is the same |
| Canvas renderer + pan/zoom | 2 days | Includes viewport culling + transform optimization |
| Vue component structure + Pinia | 1–2 days | Project state, selection, undo scaffolding |
| Settings UI (all 7 component forms) | 3–5 days | Largest UI surface; opportunity to consolidate |
| File I/O + G-code export | 1 day | File System Access API + Blob download |
| Polish, keyboard shortcuts, menus | 2–3 days | |
| **Total estimate** | **~2–3 weeks** | Solo developer, feature-parity target |

---

## Risks and Mitigations

**Binary file format migration**  
Existing `.panelgen` files cannot be opened by the web app without a converter. Write a small converter early — either a TypeScript CLI script or keep the C# reader as a one-shot migration tool. Low risk.

**Hershey font data**  
Font files are loaded from disk by path in the C# code. For the web port, convert the font data to JSON and embed in the bundle or lazy-load via `fetch`. The rendering logic ports unchanged.

**File System Access API compatibility**  
Supported in Chrome and Edge but not Firefox. Fallback: `<input type="file">` for open, Blob download for save. The PWA experience degrades gracefully.

**No undo/redo (current and future)**  
Neither version has it. A web rewrite is the right time to add it. Pinia makes immutable state snapshots straightforward — an `undoStack: ProjectSnapshot[]` costs little during a rewrite and pays off immediately in usability.

---

## Recommended Port Sequence

1. **TypeScript domain model** — `PanelStockItem` hierarchy, geometry math, G-code generation. No UI. Validate with unit tests against known G-code output.
2. **Canvas renderer** — `CanvasDraw`, viewport culling, pan/zoom with `setTransform`. Renders a hardcoded test project.
3. **Pinia state + Vue shell** — JSON load/save, basic toolbar, item list.
4. **Component settings forms** — One item type at a time. Start with `CircularPocket` (most complex G-code logic) to validate the full pipeline early.
5. **Full G-code export** — Validated against C# output on known test panels.
6. **Polish** — Keyboard shortcuts, grid display, undo/redo.

---

## Conclusion

The port is well-motivated and tractable. The clean split between `PanelGen.Cli` and `PanelGen.Display` means the hardest part — the milling math and G-code generation — ports without architectural changes. The main effort is rebuilding the settings UI in Vue, which is simultaneously the main opportunity to improve the UX.

**Canvas 2D** is the right rendering choice: it matches the existing `IDraw` abstraction closely, supports the performance fixes with straightforward code, and avoids the complexity of WebGL for a 2D wireframe application of this scale.

The performance problems are fixable with two changes that apply equally to the existing C# app: (1) viewport culling using the already-present `ExtentsRenderer` bounding boxes, and (2) single-transform pan/zoom to eliminate per-vertex coordinate recalculation on every mouse move.
