import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import type { Predicate } from "@fp-ts/data/Predicate"
import type { Refinement } from "@fp-ts/data/Refinement"
/**
 * Filters the elements emitted by this stream using the provided function.
 *
 * @tsplus static effect/core/stream/Stream.Aspects filter
 * @tsplus pipeable effect/core/stream/Stream filter
 * @category filtering
 * @since 1.0.0
 */
export function filter<A, B extends A>(
  f: Refinement<A, B>
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, B>
export function filter<A>(
  f: Predicate<A>
): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A>
export function filter<A>(f: Predicate<A>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, A> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapOut(Chunk.filter(f)))
  }
}
