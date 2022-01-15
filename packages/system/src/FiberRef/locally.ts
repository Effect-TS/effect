// ets_tracing: off

import type { Effect } from "../Effect/effect"
import type { XFiberRef } from "./fiberRef"

/**
 * Returns an `IO` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `bracket`.
 */
export const locally =
  <A>(value: A) =>
  <R, E, C>(use: Effect<R, E, C>) =>
  <EA, EB, B>(fiberRef: XFiberRef<EA, EB, A, B>): Effect<R, EA | E, C> =>
    fiberRef.locally(value)(use)
