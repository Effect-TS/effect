/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @tsplus getter effect/core/stm/STM negate
 */
export function negate<R, E>(self: STM<R, E, boolean>): STM<R, E, boolean> {
  return self.map((b) => !b)
}
