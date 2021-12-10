import * as St from "../../../../Structural"
import * as Chunk from "../core"
import * as forEach from "./forEach"

/**
 * Deduplicates adjacent elements that are identical.
 */
export function dedupe<A>(chunk: Chunk.Chunk<A>): Chunk.Chunk<A> {
  const builder = Chunk.builder<A>()
  let lastA: A | null = null

  forEach.forEach_(chunk, (a) => {
    if (!St.equals(lastA, a)) {
      builder.append(a)
      lastA = a
    }
  })

  return builder.build()
}
