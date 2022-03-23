import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 *
 * @tsplus static ets/StreamOps unfoldChunk
 */
export function unfoldChunk<S, A>(
  s: LazyArg<S>,
  f: (s: S) => Option<Tuple<[Chunk<A>, S]>>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return new StreamInternal(Channel.suspend(loop(s, f)))
}

function loop<S, A>(
  s: LazyArg<S>,
  f: (s: S) => Option<Tuple<[Chunk<A>, S]>>,
  __tsplusTrace?: string
): Channel<unknown, unknown, unknown, unknown, never, Chunk<A>, unknown> {
  return f(s()).fold(
    Channel.unit,
    ({ tuple: [as, s] }) => Channel.write(as) > loop(s, f)
  )
}
