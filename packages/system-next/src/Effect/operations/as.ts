import type { Effect } from "../definition"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @ets fluent ets/Effect as
 */
export function as_<R, E, A, B>(
  self: Effect<R, E, A>,
  value: B,
  __trace?: string
): Effect<R, E, B> {
  return map_(self, () => value, __trace)
}

/**
 * Maps the success value of this effect to the specified constant value.
 */
export function as<B>(value: B, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, B> => as_(self, value, __trace)
}
