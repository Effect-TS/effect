import { Chunk } from "../../../collection/immutable/Chunk"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import { Stream } from "../definition"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @tsplus static ets/StreamOps unfoldEffect
 */
export function unfoldEffect<S, R, E, A>(
  s: LazyArg<S>,
  f: (s: S) => Effect<R, E, Option<Tuple<[A, S]>>>
): Stream<R, E, A> {
  return Stream.unfoldChunkEffect<S, R, E, A>(s, (s) =>
    f(s).map((option) => option.map(({ tuple: [a, s] }) => Tuple(Chunk.single(a), s)))
  )
}
