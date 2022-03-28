import { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Stream } from "../definition"

/**
 * Like `unfold`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 *
 * @tsplus static ets/StreamOps paginate
 */
export function paginate<S, A>(
  s: LazyArg<S>,
  f: (s: S) => Tuple<[A, Option<S>]>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return Stream.paginateChunk(s, (s) => {
    const {
      tuple: [a, maybeS]
    } = f(s)
    return Tuple(Chunk.single(a), maybeS)
  })
}
