import type { LazyArg } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Returns a lazily constructed stream.
 *
 * @tsplus static ets/StreamOps suspend
 */
export function suspend<R, E, A>(
  stream: LazyArg<Stream<R, E, A>>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return new StreamInternal(
    Channel.suspend(() => {
      const stream0 = stream()
      concreteStream(stream0)
      return stream0.channel
    })
  )
}
