import { identity } from "@fp-ts/data/Function"

/**
 * Like `flattenPar`, but executes all streams concurrently.
 *
 * @tsplus static effect/core/stream/Stream.Aspects flattenParUnbounded
 * @tsplus pipeable effect/core/stream/Stream flattenParUnbounded
 * @category sequencing
 * @since 1.0.0
 */
export function flattenParUnbounded(outputBuffer = 16) {
  return <R, E, A, R1, E1>(self: Stream<R, E, Stream<R1, E1, A>>): Stream<R | R1, E | E1, A> =>
    self.flatMapPar(Number.POSITIVE_INFINITY, identity, outputBuffer)
}
