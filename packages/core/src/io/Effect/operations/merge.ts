/**
 * Returns a new effect where the error channel has been merged into the
 * success channel to their common combined type.
 *
 * @tsplus getter effect/core/io/Effect merge
 * @category mutations
 * @since 1.0.0
 */
export function merge<R, E, A>(self: Effect<R, E, A>): Effect<R, never, E | A> {
  return self.foldEffect((e) => Effect.succeed(e), Effect.succeed)
}
