import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

/**
 * Transforms all elements of the stream for as long as the specified partial
 * function is defined.
 *
 * @tsplus static effect/core/stream/Stream.Aspects collectWhile
 * @tsplus pipeable effect/core/stream/Stream collectWhile
 * @category mutations
 * @since 1.0.0
 */
export function collectWhile<A, A1>(pf: (a: A) => Option<A1>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A1> => {
    const loop: Channel<
      R,
      E,
      Chunk.Chunk<A>,
      unknown,
      E,
      Chunk.Chunk<A1>,
      unknown
    > = Channel.readWith(
      (input: Chunk.Chunk<A>) => {
        const mapped = pipe(input, Chunk.filterMapWhile(pf))
        return mapped.length === input.length
          ? Channel.write(mapped).flatMap(() => loop)
          : Channel.write(mapped)
      },
      (err) => Channel.fail(err),
      (done) => Channel.succeed(done)
    )
    concreteStream(self)
    return new StreamInternal(self.channel >> loop)
  }
}
