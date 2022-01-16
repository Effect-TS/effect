// ets_tracing: off

import type { Effect } from "../../Effect"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 */
export function locally_<R, EA, EB, EC, A, B, C>(
  self: XFiberRef<EA, EB, A, B>,
  value: A,
  use: Effect<R, EC, C>,
  __trace?: string
): Effect<R, EA | EC, C> {
  concreteUnified(self)
  return self.locally(value, __trace)(use)
}

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 *
 * @ets_data_first locally_
 */
export function locally<R, EC, A, C>(
  value: A,
  use: Effect<R, EC, C>,
  __trace?: string
) {
  return <EA, EB, B>(self: XFiberRef<EA, EB, A, B>): Effect<R, EA | EC, C> =>
    locally_(self, value, use, __trace)
}
