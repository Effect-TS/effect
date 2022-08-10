import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Performs an effectful filter and map in a single step.
 *
 * @tsplus static effect/core/stream/Stream.Aspects collectEffect
 * @tsplus pipeable effect/core/stream/Stream collectEffect
 */
export function collectEffect<A, R2, E2, A2>(
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
      (elem) => loop(elem[Symbol.iterator](), pf),
      (err) => Channel.failCauseSync(err),
      (done) => Channel.sync(done)
    )
  } else {
    return Channel.unwrap(
      pf(next.value).fold(
        () => Effect.sync(loop<E, A, R1, E1, A1>(chunkIterator, pf)),
        effect =>
          effect.map(
            a1 =>
              Channel.write(Chunk.single(a1)).flatMap(() =>
                loop<E, A, R1, E1, A1>(chunkIterator, pf)
              )
          )
      )
    )
  }
}
