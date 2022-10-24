import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"

/**
 * Takes the specified number of elements from this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects take
 * @tsplus pipeable effect/core/stream/Stream take
 * @category mutations
 * @since 1.0.0
 */
export function take(n: number) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> => {
    if (!Number.isInteger(n)) {
      return Stream.dieSync(new IllegalArgumentException(`${n} must be an integer`))
    }
    concreteStream(self)
    return new StreamInternal(
      n <= 0 ? Channel.unit : Channel.suspend(self.channel.pipeTo(loop<R, E, A>(n)))
    )
  }
}

function loop<R, E, A>(
  n: number
): Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, unknown> {
  return Channel.readWith(
    (chunk: Chunk.Chunk<A>) => {
      const taken = pipe(chunk, Chunk.take(n))
      const leftover = Math.max(0, n - taken.length)
      const more = leftover > 0
      return more
        ? Channel.write(taken).flatMap(() => loop<R, E, A>(leftover))
        : Channel.write(taken)
    },
    (err) => Channel.fail(err),
    (done) => Channel.succeed(done)
  )
}
