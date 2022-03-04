import type { STM } from "../definition"

/**
 * Returns a new effect where boolean value of this effect is negated.
 *
 * @tsplus fluent ets/STM negate
 */
export function negate<R, E>(
  self: STM<R, E, boolean>,
  __tsplusTrace?: string
): STM<R, E, boolean> {
  return self.map((b) => !b)
}
