import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mapEffect
 * @tsplus pipeable effect/core/stream/Stream mapEffect
 * @category mapping
 * @since 1.0.0
 */
export function mapEffect<A, R1, E1, B>(
  f: (a: A) => Effect<R1, E1, B>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R1, E | E1, B> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel >> loop<E, A, R1, E1, B>(Chunk.empty[Symbol.iterator](), f)
    )
  }
}

function loop<E, A, R1, E1, A1>(
  chunkIterator: Iterator<A>,
  f: (a: A) => Effect<R1, E1, A1>
): Channel<R1, E, Chunk.Chunk<A>, unknown, E | E1, Chunk.Chunk<A1>, unknown> {
  const next = chunkIterator.next()
  if (next.done) {
    return Channel.readWithCause(
      (elem) => loop(elem[Symbol.iterator](), f),
      (err) => Channel.failCause(err),
      (done) => Channel.succeed(done)
    )
  } else {
    return Channel.unwrap(
      Effect.suspendSucceed(f(next.value)).map(
        a1 =>
          Channel.write(Chunk.single(a1)).flatMap(
            () => loop<E, A, R1, E1, A1>(chunkIterator, f)
          )
      )
    )
  }
}
