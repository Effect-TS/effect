/**
 * Translates effect failure into death of the fiber, making all failures
 * unchecked and not a part of the type of the effect.
 *
 * @tsplus getter effect/core/io/Effect orDie
 */
export function orDie<R, E, A>(self: Effect<R, E, A>): Effect<R, never, A> {
  return self.orDieWith(identity)
}
