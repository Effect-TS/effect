import { MergeDecision } from "@effect/core/stream/Channel/MergeDecision"

/**
 * Feeds inputs to this sink until it yields a result, then switches over to
 * the provided sink until it yields a result, finally combining the two
 * results with `f`.
 *
 * @tsplus static effect/core/stream/Sink.Aspects zipWithPar
 * @tsplus pipeable effect/core/stream/Sink zipWithPar
 */
export function zipWithPar<R1, E1, In1, L1, Z, Z1, Z2>(
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  f: (z: Z, z1: Z1) => Z2,
  __tsplusTrace?: string
) {
  return <R, E, In, L>(self: Sink<R, E, In, L, Z>): Sink<R | R1, E | E1, In & In1, L | L1, Z2> =>
    self.raceWith(
      that,
      (exit) =>
        exit.fold<E, Z, MergeDecision<R1, E1, Z1, E | E1, Z2>>(
          (cause) => MergeDecision.done(Effect.failCause(cause)),
          (lz) =>
            MergeDecision.await((exit) =>
              exit.fold(
                (cause): Effect<R1, E | E1, Z2> => Effect.failCause(cause),
                (rz) => Effect.succeedNow(f(lz, rz))
              )
            )
        ),
      (exit) =>
        exit.fold<E1, Z1, MergeDecision<R1, E, Z, E | E1, Z2>>(
          (cause) => MergeDecision.done(Effect.failCause(cause)),
          (rz) =>
            MergeDecision.await((exit) =>
              exit.fold(
                (cause): Effect<R1, E | E1, Z2> => Effect.failCause(cause),
                (lz) => Effect.succeedNow(f(lz, rz))
              )
            )
        )
    )
}
