export type GuideDirection = 'horizontal' | 'vertical'

export class Guide {
  direction: GuideDirection = 'horizontal'
  /** Y coordinate for horizontal guides, X coordinate for vertical guides. */
  pos = 0
}
