import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Creates a `Take<never, A>` with the specified chunk.
 *
 * @tsplus static effect/core/stream/Take.Ops chunk
 * @category constructors
 * @since 1.0.0
 */
export function chunk<A>(chunk: Chunk<A>): Take<never, A> {
  return new TakeInternal(Exit.succeed(chunk))
}
