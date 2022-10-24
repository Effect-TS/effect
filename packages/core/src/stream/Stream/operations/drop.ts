import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Drops the specified number of elements from this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects drop
 * @tsplus pipeable effect/core/stream/Stream drop
 * @category mutations
 * @since 1.0.0
 */
export function drop(n: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.pipeTo(loop<R, E, A>(n)))
  }
}

function loop<R, E, A>(
  r: number
): Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> {
  return Channel.readWith(
    (chunk: Chunk.Chunk<A>) => {
      const dropped = pipe(chunk, Chunk.drop(r))
      const leftover = Math.max(0, r - chunk.length)
      const more = Chunk.isEmpty(chunk) || leftover > 0
      return more
        ? loop<R, E, A>(leftover)
        : Channel.write(dropped).flatMap(() => Channel.identity<E, Chunk.Chunk<A>, unknown>())
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}
