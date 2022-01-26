import { Effect } from "../definition"

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @ets fluent ets/Effect asUnit
 */
export function asUnit<R, E, X>(self: Effect<R, E, X>, __etsTrace?: string) {
  return self.flatMap(() => Effect.unit)
}
