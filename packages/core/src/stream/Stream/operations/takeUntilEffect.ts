import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects takeUntilEffect
 * @tsplus pipeable effect/core/stream/Stream takeUntilEffect
 * @category mutations
 * @since 1.0.0
 */
export function takeUntilEffect<A, R2, E2>(
  f: (a: A) => Effect<R2, E2, boolean>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.pipeTo(loop<E, A, R2, E2>(Chunk.empty[Symbol.iterator](), f))
    )
  }
}

function loop<E, A, R1, E1>(
  chunkIterator: Iterator<A>,
  f: (a: A) => Effect<R1, E1, boolean>
): Channel<R1, E, Chunk.Chunk<A>, unknown, E | E1, Chunk.Chunk<A>, unknown> {
  const next = chunkIterator.next()
  if (next.done) {
    return Channel.readWithCause(
      elem => loop(elem[Symbol.iterator](), f),
      err => Channel.failCause(err),
      done => Channel.succeed(done)
    )
  } else {
    return Channel.unwrap(
      f(next.value).map(b =>
        b
          ? Channel.write(Chunk.single(next.value))
          : Channel.write(Chunk.single(next.value)).flatMap(() =>
            loop<E, A, R1, E1>(chunkIterator, f)
          )
      )
    )
  }
}
