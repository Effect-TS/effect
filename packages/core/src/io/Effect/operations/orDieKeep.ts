/**
 * Converts all failures to unchecked exceptions.
 *
 * @tsplus getter effect/core/io/Effect orDieKeep
 * @category alternatives
 * @since 1.0.0
 */
export function orDieKeep<R, E, A>(self: Effect<R, E, A>) {
  return self.foldCauseEffect(
    (cause) => Effect.failCause(cause.flatMap(Cause.die)),
    Effect.succeed
  )
}
