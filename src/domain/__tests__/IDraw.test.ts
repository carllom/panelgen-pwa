import { describe, it, expect } from 'vitest'
import type { IDraw } from '../IDraw'

describe('IDraw', () => {
  it('can be implemented as a recording spy', () => {
    const calls: string[] = []
    const draw: IDraw = {
      moveTo: (x, y) => calls.push(`M${x},${y}`),
      lineTo: (x, y) => calls.push(`L${x},${y}`),
    }

    draw.moveTo(0, 0)
    draw.lineTo(10, 5)

    expect(calls).toEqual(['M0,0', 'L10,5'])
  })
})
