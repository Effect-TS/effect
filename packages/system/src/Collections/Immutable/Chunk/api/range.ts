import type { Chunk } from "../core"
import { append_, empty } from "../core"

/**
 * Build a chunk with an integer range with both min/max included
 */
export function range(min: number, max: number): Chunk<number> {
  let builder = empty<number>()
  for (let i = min; i <= max; i++) {
    builder = append_(builder, i)
  }
  return builder
}
