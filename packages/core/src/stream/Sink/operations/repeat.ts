import * as Chunk from "@fp-ts/data/Chunk"
import { constTrue, pipe } from "@fp-ts/data/Function"

/**
 * Repeatedly runs the provided sink.
 *
 * @tsplus getter effect/core/stream/Sink repeat
 * @category mutations
 * @since 1.0.0
 */
export function repeat<R, E, In, L extends In, Z>(
  self: Sink<R, E, In, L, Z>
): Sink<R, E, In, L, Chunk.Chunk<Z>> {
  return self.collectAllWhileWith(
    Chunk.empty as Chunk.Chunk<Z>,
    constTrue,
    (s, z) => pipe(s, Chunk.append(z))
  )
}
