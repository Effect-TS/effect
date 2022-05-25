/**
 * Ignores the result of the effect replacing it with a void
 *
 * @tsplus fluent ets/Effect asUnit
 */
export function asUnit<R, E, X>(self: Effect<R, E, X>, __tsplusTrace?: string): Effect<R, E, void> {
  return self > Effect.unit
}
