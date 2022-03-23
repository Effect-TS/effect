import type { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../../Channel"
import type { Stream } from "../../Stream"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Drops the specified number of elements from this stream.
 *
 * @tsplus fluent ets/Stream drop
 */
export function drop_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Stream<R, E, A> {
  concreteStream(self)
  return new StreamInternal(self.channel >> loop<R, E, A>(n))
}

/**
 * Drops the specified number of elements from this stream.
 *
 * @tsplus static ets/StreamOps drop
 */
export const drop = Pipeable(drop_)

function loop<R, E, A>(
  r: number
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> {
  return Channel.readWith(
    (chunk: Chunk<A>) => {
      const dropped = chunk.drop(r)
      const leftover = Math.max(0, r - chunk.length)
      const more = chunk.isEmpty() || leftover > 0
      return more
        ? loop<R, E, A>(leftover)
        : Channel.write(dropped) > Channel.identity<E, Chunk<A>, unknown>()
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}
