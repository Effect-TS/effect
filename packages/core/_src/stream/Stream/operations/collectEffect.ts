import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Performs an effectful filter and map in a single step.
 *
 * @tsplus fluent ets/Stream collectEffect
 */
export function collectEffect_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  pf: (a: A) => Option<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Stream<R | R2, E | E2, A2> {
  concreteStream(self)
  return new StreamInternal(
    self.channel >> loop(Chunk.empty<A>()[Symbol.iterator](), pf)
  )
}

/**
 * Performs an effectful filter and map in a single step.
 *
 * @tsplus static ets/Stream/Aspects collectEffect
 */
export const collectEffect = Pipeable(collectEffect_)

function loop<E, A, R1, E1, A1>(
  chunkIterator: Iterator<A>,
  pf: (a: A) => Option<Effect<R1, E1, A1>>
): Channel<R1, E, Chunk<A>, unknown, E | E1, Chunk<A1>, unknown> {
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
        () => Effect.succeed(loop(chunkIterator, pf)),
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
