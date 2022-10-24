import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import * as Chunk from "@fp-ts/data/Chunk"
import type { Option } from "@fp-ts/data/Option"

/**
 * Performs a filter and map in a single step.
 *
 * @tsplus static effect/core/stream/Stream.Aspects collect
 * @tsplus pipeable effect/core/stream/Stream collect
 * @category mutations
 * @since 1.0.0
 */
export function collect<A, B>(pf: (a: A) => Option<B>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R, E, B> => {
    concreteStream(self)
    return new StreamInternal(self.channel.mapOut(Chunk.filterMap(pf)))
  }
}
