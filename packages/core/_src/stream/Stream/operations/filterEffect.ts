import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Effectfully filters the elements emitted by this stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects filterEffect
 * @tsplus pipeable effect/core/stream/Stream filterEffect
 */
export function filterEffect<A, R1, E1>(
  f: (a: A) => Effect<R1, E1, boolean>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R1, E | E1, A> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel >> loop(Chunk.empty<A>()[Symbol.iterator](), f)
    )
  }
}

function loop<E, A, R1, E1>(
  chunkIterator: Iterator<A>,
  f: (a: A) => Effect<R1, E1, boolean>
): Channel<R1, E, Chunk<A>, unknown, E | E1, Chunk<A>, unknown> {
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
          ? Channel.write(Chunk.single(next.value)) >
            loop<E, A, R1, E1>(chunkIterator, f)
          : loop<E, A, R1, E1>(chunkIterator, f)
      )
    )
  }
}
