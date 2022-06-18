/**
 * An effect that succeeds with a unit value.
 *
 * @tsplus static ets/Effect/Ops unit
 */
export const unit: Effect<never, never, void> = Effect.succeedNow(undefined)

/**
 * An effect that succeeds with a unit value.
 *
 * @tsplus static ets/Effect/Ops unitTraced
 */
export function unitTraced(__tsplusTrace?: string): Effect<never, never, void> {
  return Effect.succeedNow(undefined)
}

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @tsplus fluent ets/Effect unit
 */
export function unit_<R, E, X>(self: Effect<R, E, X>, __tsplusTrace?: string): Effect<R, E, void> {
  return self > Effect.unit
}
