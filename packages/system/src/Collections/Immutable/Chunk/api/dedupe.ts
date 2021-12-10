import * as St from "../../../../Structural"
import * as Chunk from "../core"

/**
 * Filter out optional values
 */
export function dedupe<A>(chunk: Chunk.Chunk<A>): Chunk.Chunk<A> {
  const builder = Chunk.builder<A>()
  let lastA: A | null = null

  for (const a of chunk) {
    if (!St.equals(lastA, a)) {
      builder.append(a)
      lastA = a
    }
  }

  return builder.build()
}
