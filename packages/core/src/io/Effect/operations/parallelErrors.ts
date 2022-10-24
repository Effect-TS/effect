import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Exposes all parallel errors in a single call.
 *
 * @tsplus getter effect/core/io/Effect parallelErrors
 * @category mutations
 * @since 1.0.0
 */
export function parallelErrors<R, E, A>(self: Effect<R, E, A>): Effect<R, Chunk.Chunk<E>, A> {
  return self.foldCauseEffect((cause) => {
    const errors = Chunk.fromIterable(cause.failures)
    return errors.length === 0
      ? Effect.failCause(cause as Cause<never>)
      : Effect.fail(errors)
  }, Effect.succeed)
}
