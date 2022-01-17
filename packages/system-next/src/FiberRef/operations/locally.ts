import type { Effect } from "../../Effect"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition/concrete"

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 */
export function locally_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  value: A,
  __trace?: string
): <R, EC, C>(use: Effect<R, EC, C>) => Effect<R, EA | EC, C> {
  concreteUnified(self)
  return self.locally(value, __trace)
}

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 *
 * @ets_data_first locally_
 */
export function locally<R, EC, A, C>(value: A, __trace?: string) {
  return <EA, EB, B>(
    self: XFiberRef<EA, EB, A, B>
  ): ((use: Effect<R, EC, C>) => Effect<R, EA | EC, C>) =>
    locally_(self, value, __trace)
}
