export interface Tool {
  number: number
  name: string
  diameter: number
  zStep: number
  feedRate: number
  zFeedRate: number
  rpm: number
}

export function toolRadius(t: Tool): number { return t.diameter / 2 }

export function makeTool(overrides?: Partial<Tool>): Tool {
  return {
    number: 1,
    name: '',
    diameter: 3,
    zStep: 0.5,
    feedRate: 800,
    zFeedRate: 300,
    rpm: 10000,
    ...overrides,
  }
}
