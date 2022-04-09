import { TerminationStrategy } from "@effect/core/stream/Stream//TerminationStrategy";

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 *
 * @tsplus fluent ets/Stream mergeEither
 */
export function mergeEither_<R, E, A, R2, E2, A2>(
  self: Stream<R, E, A>,
  that: LazyArg<Stream<R2, E2, A2>>,
  strategy: LazyArg<TerminationStrategy> = () => TerminationStrategy.Both,
  __tsplusTrace?: string
): Stream<R & R2, E | E2, Either<A, A2>> {
  return self.mergeWith(
    that,
    (a) => Either.leftW(a),
    (a2) => Either.rightW(a2),
    strategy
  );
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 *
 * @tsplus static ets/Stream/Aspects mergeEither
 */
export const mergeEither = Pipeable(mergeEither_);
