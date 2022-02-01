import * as St from "../../../../prelude/Structural"
import { Chunk } from "../definition"

/**
 * Deduplicates adjacent elements that are identical.
 *
 * @tsplus fluent ets/Chunk dedupe
 */
export function dedupe<A>(self: Chunk<A>): Chunk<A> {
  const builder = Chunk.builder<A>()
  let lastA: A | null = null

  self.forEach((a) => {
    if (!St.equals(lastA, a)) {
      builder.append(a)
      lastA = a
    }
  })

  return builder.build()
}
