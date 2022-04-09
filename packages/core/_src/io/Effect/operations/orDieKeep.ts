/**
 * Converts all failures to unchecked exceptions.
 *
 * @tsplus fluent ets/Effect orDieKeep
 */
export function orDieKeep<R, E, A>(effect: Effect<R, E, A>, __tsplusTrace?: string) {
  return effect.foldCauseEffect(
    (cause) => Effect.failCauseNow(cause.flatMap(Cause.die)),
    Effect.succeedNow
  );
}
