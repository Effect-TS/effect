import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Effectfully transforms all elements of the stream for as long as the
 * specified partial function is defined.
 *
 * @tsplus fluent ets/Stream collectWhileEffect
 */
export function collectWhileEffect_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  pf: (a: A) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, A2> {
  concreteStream(self)
  return new StreamInternal(
    self.channel >> loop(Chunk.empty<A>()[Symbol.iterator](), pf)
  )
}

/**
 * Effectfully transforms all elements of the stream for as long as the
 * specified partial function is defined.
 *
 * @tsplus static ets/Stream/Aspects collectWhileEffect
 */
export const collectWhileEffect = Pipeable(collectWhileEffect_)

function loop<R, E, A, R1, E1, A1>(
  chunkIterator: Iterator<A>,
  pf: (a: A) => Option<Effect<R1, E1, A1>>
): Channel<R & R1, E, Chunk<A>, unknown, E | E1, Chunk<A1>, unknown> {
  const next = chunkIterator.next()
  if (next.done) {
    return Channel.readWithCause(
      elem => loop(elem[Symbol.iterator](), pf),
      err => Channel.failCause(err),
      done => Channel.succeed(done)
    )
  } else {
    return Channel.unwrap(
      pf(next.value).fold(
        () => Effect.succeed(Channel.unit),
        effect =>
          effect.map(
            a1 =>
              Channel.write(Chunk.single(a1)) >
                loop<R, E, A, R1, E1, A1>(chunkIterator, pf)
          )
      )
    )
  }
}
