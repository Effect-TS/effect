/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @tsplus getter effect/core/io/Effect negate
 */
export function negate<R, E>(self: Effect<R, E, boolean>): Effect<R, E, boolean> {
  return self.map((b) => !b)
}
