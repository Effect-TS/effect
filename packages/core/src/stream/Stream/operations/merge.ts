import { TerminationStrategy } from "@effect/core/stream/Stream/TerminationStrategy"

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 *
 * @tsplus static effect/core/stream/Stream.Aspects merge
 * @tsplus pipeable effect/core/stream/Stream merge
 */
export function merge<R2, E2, A2>(
  that: Stream<R2, E2, A2>,
  strategy: TerminationStrategy = TerminationStrategy.Both
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A | A2> =>
    self.mergeWith(
      that,
      (a): A | A2 => a,
      (a): A | A2 => a,
      strategy
    )
}
