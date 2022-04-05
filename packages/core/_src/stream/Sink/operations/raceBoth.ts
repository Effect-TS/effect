import { MergeDecision } from "@effect-ts/core/stream/Channel/MergeDecision";

/**
 * Runs both sinks in parallel on the input, returning the result or the error
 * from the one that finishes first.
 *
 * @tsplus fluent ets/Sink raceBoth
 */
export function raceBoth_<R, R1, E, E1, In, In1, L, L1, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  capacity = 16,
  __tsplusTrace?: string
): Sink<R & R1, E | E1, In & In1, L | L1, Either<Z, Z1>> {
  return self.raceWith(
    that,
    (selfDone) =>
      MergeDecision.done<R & R1, E | E1, Either<Z, Z1>>(
        Effect.done(selfDone).map(Either.left)
      ),
    (thatDone) =>
      MergeDecision.done<R & R1, E | E1, Either<Z, Z1>>(
        Effect.done(thatDone).map(Either.right)
      ),
    capacity
  );
}

/**
 * Runs both sinks in parallel on the input, returning the result or the error
 * from the one that finishes first.
 *
 * @tsplus static ets/Sink/Aspects raceBoth
 */
export const raceBoth = Pipeable(raceBoth_);
