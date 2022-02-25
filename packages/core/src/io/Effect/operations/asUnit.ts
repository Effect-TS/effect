import { Effect } from "../definition"

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @tsplus fluent ets/Effect asUnit
 */
export function asUnit<R, E, X>(self: Effect<R, E, X>, __tsplusTrace?: string) {
  return self > Effect.unit
}
