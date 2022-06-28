import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Drops the specified number of elements from this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects drop
 * @tsplus pipeable effect/core/stream/Stream drop
 */
export function drop(n: number, __tsplusTrace?: string) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel >> loop<R, E, A>(n))
  }
}

function loop<R, E, A>(
  r: number
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> {
  return Channel.readWith(
    (chunk: Chunk<A>) => {
      const dropped = chunk.drop(r)
      const leftover = Math.max(0, r - chunk.length)
      const more = chunk.isEmpty || leftover > 0
      return more
        ? loop<R, E, A>(leftover)
        : Channel.write(dropped) > Channel.identity<E, Chunk<A>, unknown>()
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}
