import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { Effect } from "../../../io/Effect"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Like `unfoldChunkEffect`, but allows the emission of values to end one step
 * further than the unfolding of the state. This is useful for embedding
 * paginated APIs, hence the name.
 *
 * @tsplus static ets/StreamOps paginateChunkEffect
 */
export function paginateChunkEffect<S, R, E, A>(
  s: LazyArg<S>,
  f: (s: S) => Effect<R, E, Tuple<[Chunk<A>, Option<S>]>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return new StreamInternal(Channel.suspend(loop(s, f)))
}

function loop<S, R, E, A>(
  s: LazyArg<S>,
  f: (s: S) => Effect<R, E, Tuple<[Chunk<A>, Option<S>]>>,
  __tsplusTrace?: string
): Channel<R, unknown, unknown, unknown, E, Chunk<A>, unknown> {
  return Channel.unwrap(
    f(s()).map(({ tuple: [as, maybeS] }) =>
      maybeS.fold(
        Channel.write(as) > Channel.unit,
        (s) => Channel.write(as) > loop(s, f)
      )
    )
  )
}
