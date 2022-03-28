import { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Like `unfoldEffect`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @tsplus static ets/StreamOps paginateEffect
 */
export function paginateEffect<S, R, E, A>(
  s: LazyArg<S>,
  f: (s: S) => Effect<R, E, Tuple<[A, Option<S>]>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return Stream.paginateChunkEffect(s, (s) =>
    f(s).map(({ tuple: [a, s] }) => Tuple(Chunk.single(a), s))
  )
}
