// ets_tracing: off

import type { Effect } from "../Effect/effect.js"
import type { XFiberRef } from "./fiberRef.js"

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `bracket`.
 *
 * @ets_data_first locally_
 */
export function locally<A>(value: A) {
  return <EA, EB, B>(
    fiberRef: XFiberRef<EA, EB, A, B>
  ): (<R, E, C>(effect: Effect<R, E, C>) => Effect<R, EA | E, C>) =>
    locally_(fiberRef, value)
}

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `bracket`.
 */
export function locally_<EA, EB, A, B>(fiberRef: XFiberRef<EA, EB, A, B>, value: A) {
  return <R, E, C>(effect: Effect<R, E, C>) => fiberRef.locally(value, effect)
}
