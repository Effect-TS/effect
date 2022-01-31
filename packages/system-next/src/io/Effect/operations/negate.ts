import type { Effect } from "../definition"

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @ets fluent ets/Effect negate
 */
export function negate<R, E>(
  self: Effect<R, E, boolean>,
  __etsTrace?: string
): Effect<R, E, boolean> {
  return self.map((b) => !b)
}
