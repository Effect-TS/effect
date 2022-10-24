import { TakeInternal } from "@effect/core/stream/Take/operations/_internal/TakeInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Creates a `Take<never, A>` with a singleton chunk.
 *
 * @tsplus static effect/core/stream/Take.Ops single
 * @category constructors
 * @since 1.0.0
 */
export function single<A>(a: A): Take<never, A> {
  return new TakeInternal(Exit.succeed(Chunk.single(a)))
}
