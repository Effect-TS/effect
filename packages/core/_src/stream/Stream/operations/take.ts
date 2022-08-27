import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Takes the specified number of elements from this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects take
 * @tsplus pipeable effect/core/stream/Stream take
 */
export function take(n: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    if (!Number.isInteger(n)) {
      return Stream.dieSync(new IllegalArgumentException(`${n} must be an integer`))
    }
    concreteStream(self)
    return new StreamInternal(
      n <= 0 ? Channel.unit : Channel.suspend(self.channel >> loop<R, E, A>(n))
    )
  }
}

function loop<R, E, A>(
  n: number
): Channel<R, E, Chunk<A>, unknown, E, Chunk<A>, unknown> {
  return Channel.readWith(
    (chunk: Chunk<A>) => {
      const taken = chunk.take(Math.min(n, Number.MAX_SAFE_INTEGER))
      const leftover = Math.max(0, n - taken.length)
      const more = leftover > 0
      return more
        ? Channel.write(taken) > loop<R, E, A>(leftover)
        : Channel.write(taken)
    },
    (err) => Channel.fail(err),
    (done) => Channel.succeed(done)
  )
}
