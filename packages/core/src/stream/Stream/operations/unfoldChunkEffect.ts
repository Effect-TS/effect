import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type
 * `S`.
 *
 * @tsplus static ets/StreamOps unfoldChunkEffect
 */
export function unfoldChunkEffect<S, R, E, A>(
  s: LazyArg<S>,
  f: (s: S) => Effect<R, E, Option<Tuple<[Chunk<A>, S]>>>
): Stream<R, E, A> {
  return new StreamInternal(loop(s, f))
}

function loop<S, R, E, A>(
  s: LazyArg<S>,
  f: (s: S) => Effect<R, E, Option<Tuple<[Chunk<A>, S]>>>
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown> {
  return Channel.unwrap(
    f(s()).map((option) =>
      option.fold(Channel.unit, ({ tuple: [as, s] }) => Channel.write(as) > loop(s, f))
    )
  )
}
