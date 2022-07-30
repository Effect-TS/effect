/**
 * Converts all failures to unchecked exceptions.
 *
 * @tsplus getter effect/core/io/Effect orDieKeep
 */
export function orDieKeep<R, E, A>(self: Effect<R, E, A>, __tsplusTrace?: string) {
  return self.foldCauseEffect(
    (cause) => Effect.failCause(cause.flatMap(Cause.die)),
    Effect.succeed
  )
}
