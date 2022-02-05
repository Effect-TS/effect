// ets_tracing: off

import * as St from "../../../../Structural/index.js"
import * as Chunk from "../core.js"
import * as forEach from "./forEach.js"

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
