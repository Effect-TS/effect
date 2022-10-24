import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Effectfully transforms all elements of the stream for as long as the
 * specified partial function is defined.
 *
 * @tsplus static effect/core/stream/Stream.Aspects collectWhileEffect
 * @tsplus pipeable effect/core/stream/Stream collectWhileEffect
 * @category mutations
 * @since 1.0.0
 */
export function collectWhileEffect<A, R2, E2, A2>(
  pf: (a: A) => Option<Effect<R2, E2, A2>>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A2> => {
    concreteStream(self)
    return new StreamInternal(
      self.channel.pipeTo(loop<E, A, R2, E2, A2>(Chunk.empty[Symbol.iterator](), pf))
    )
  }
}

function loop<E, A, R1, E1, A1>(
  chunkIterator: Iterator<A>,
  pf: (a: A) => Option<Effect<R1, E1, A1>>
): Channel<R1, E, Chunk.Chunk<A>, unknown, E | E1, Chunk.Chunk<A1>, unknown> {
  const next = chunkIterator.next()
  if (next.done) {
    return Channel.readWithCause(
      elem => loop(elem[Symbol.iterator](), pf),
      err => Channel.failCause(err),
      done => Channel.succeed(done)
    )
  } else {
    const option = pf(next.value)
    switch (option._tag) {
      case "None": {
        return Channel.unwrap(Effect.succeed(Channel.unit))
      }
      case "Some": {
        return Channel.unwrap(
          option.value.map(a1 =>
            Channel.write(Chunk.single(a1)).flatMap(() => loop<E, A, R1, E1, A1>(chunkIterator, pf))
          )
        )
      }
    }
  }
}
