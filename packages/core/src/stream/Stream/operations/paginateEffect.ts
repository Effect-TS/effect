import * as Chunk from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Like `unfoldEffect`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @tsplus static effect/core/stream/Stream.Ops paginateEffect
 * @category mutations
 * @since 1.0.0
 */
export function paginateEffect<S, R, E, A>(
  s: S,
  f: (s: S) => Effect<R, E, readonly [A, Option<S>]>
): Stream<R, E, A> {
  return Stream.paginateChunkEffect(
    s,
    (s) => f(s).map(([a, s]) => [Chunk.single(a), s])
  )
}
