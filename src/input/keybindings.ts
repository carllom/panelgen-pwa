export interface KeyBinding {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  guard?(): boolean
  action(): void
}

export function dispatchKey(e: KeyboardEvent, bindings: KeyBinding[]): void {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  for (const b of bindings) {
    if (b.key !== e.key) continue
    if (b.ctrl  !== undefined && b.ctrl  !== e.ctrlKey)  continue
    if (b.shift !== undefined && b.shift !== e.shiftKey) continue
    if (b.alt   !== undefined && b.alt   !== e.altKey)   continue
    if (b.guard && !b.guard()) continue
    e.preventDefault()
    b.action()
    return
  }
}
