import { TerminationStrategy } from "@effect/core/stream/Stream//TerminationStrategy"

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mergeEither
 * @tsplus pipeable effect/core/stream/Stream mergeEither
 */
export function mergeEither<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>,
  strategy: LazyArg<TerminationStrategy> = () => TerminationStrategy.Both,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, Either<A, A2>> =>
    self.mergeWith(
      that,
      (a) => Either.leftW(a),
      (a2) => Either.rightW(a2),
      strategy
    )
}
