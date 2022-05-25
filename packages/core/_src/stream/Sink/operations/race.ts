/**
 * Runs both sinks in parallel on the input, , returning the result or the
 * error from the one that finishes first.
 *
 * @tsplus fluent ets/Sink race
 */
export function race_<R, R1, E, E1, In, In1, L, L1, Z, Z1>(
  self: Sink<R, E, In, L, Z>,
  that: LazyArg<Sink<R1, E1, In1, L1, Z1>>,
  __tsplusTrace?: string
): Sink<R & R1, E | E1, In & In1, L | L1, Z | Z1> {
  return self.raceBoth(that).map((either) => either.merge())
}

/**
 * Runs both sinks in parallel on the input, , returning the result or the
 * error from the one that finishes first.
 *
 * @tsplus static ets/Sink/Aspects race
 */
export const race = Pipeable(race_)
