/**
 * Exposes all parallel errors in a single call.
 *
 * @tsplus getter effect/core/io/Effect parallelErrors
 */
export function parallelErrors<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, Chunk<E>, A> {
  return self
    .foldCauseEffect((cause) => {
      const errors = Chunk.from(cause.failures)
      return errors.length === 0
        ? Effect.failCause(cause as Cause<never>)
        : Effect.fail(errors)
    }, Effect.succeed)
}
