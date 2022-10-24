import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"

/**
 * Finds the first element emitted by this stream that satisfies the provided
 * predicate.
 *
 * @tsplus static effect/core/stream/Stream.Aspects find
 * @tsplus pipeable effect/core/stream/Stream find
 * @category elements
 * @since 1.0.0
 */
export function find<A, B extends A>(
  f: Refinement<A, B>
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
export function find<A>(
  f: Predicate<A>
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
export function find<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    const loop: Channel<R, E, Chunk.Chunk<A>, unknown, E, Chunk.Chunk<A>, any> = Channel.readWith(
      (chunk) => {
        const option = pipe(chunk, Chunk.findFirst(f))
        switch (option._tag) {
          case "None": {
            return loop
          }
          case "Some": {
            return Channel.write(Chunk.single(option.value))
          }
        }
      },
      Channel.fail,
      (_) => Channel.unit
    )
    concreteStream(self)
    return new StreamInternal(self.channel >> loop)
  }
}
