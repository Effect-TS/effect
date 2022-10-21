import { MergeDecision } from "@effect/core/stream/Channel/MergeDecision"

/**
 * Runs both sinks in parallel on the input, returning the result or the error
 * from the one that finishes first.
 *
 * @tsplus static effect/core/stream/Sink.Aspects raceBoth
 * @tsplus pipeable effect/core/stream/Sink raceBoth
 */
export function raceBoth<R1, E1, In1, L1, Z1>(that: Sink<R1, E1, In1, L1, Z1>, capacity = 16) {
  return <R, E, In, L, Z>(
    self: Sink<R, E, In, L, Z>
  ): Sink<R | R1, E | E1, In & In1, L | L1, Either<Z, Z1>> =>
    self.raceWith(
      that,
      (selfDone) =>
        MergeDecision.done<R | R1, E | E1, Either<Z, Z1>>(
          Effect.done(selfDone).map(Either.left)
        ),
      (thatDone) =>
        MergeDecision.done<R | R1, E | E1, Either<Z, Z1>>(
          Effect.done(thatDone).map(Either.right)
        ),
      capacity
    )
}
