export interface Tool {
  number: number
  diameter: number
  zStep: number
}

export function toolRadius(t: Tool): number { return t.diameter / 2 }
