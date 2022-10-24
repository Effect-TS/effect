import * as Chunk from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Like `unfold`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 *
 * @tsplus static effect/core/stream/Stream.Ops paginate
 * @category mutations
 * @since 1.0.0
 */
export function paginate<S, A>(
  s: S,
  f: (s: S) => readonly [A, Option<S>]
): Stream<never, never, A> {
  return Stream.paginateChunk(s, (s) => {
    const [a, option] = f(s)
    return [Chunk.single(a), option] as const
  })
}
