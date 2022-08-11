import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Effectfully transforms all elements of the stream for as long as the
 * specified partial function is defined.
 *
 * @tsplus static effect/core/stream/Stream.Aspects collectWhileEffect
 * @tsplus pipeable effect/core/stream/Stream collectWhileEffect
 */
export function collectWhileEffect<A, R2, E2, A2>(
  pf: (a: A) => Maybe<Effect<R2, E2, A2>>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel >> loop<E, A, R2, E2, A2>(Chunk.empty<A>()[Symbol.iterator](), pf)
    )
  }
}

function loop<E, A, R1, E1, A1>(
  chunkIterator: Iterator<A>,
  pf: (a: A) => Maybe<Effect<R1, E1, A1>>
): Channel<R1, E, Chunk<A>, unknown, E | E1, Chunk<A1>, unknown> {
  const next = chunkIterator.next()
  if (next.done) {
    return Channel.readWithCause(
      elem => loop(elem[Symbol.iterator](), pf),
      err => Channel.failCause(err),
      done => Channel.sync(done)
    )
  } else {
    return Channel.unwrap(
      pf(next.value).fold(
        () => Effect.sync(Channel.unit),
        effect =>
          effect.map(
            a1 =>
              Channel.write(Chunk.single(a1)) >
                loop<E, A, R1, E1, A1>(chunkIterator, pf)
          )
      )
    )
  }
}
