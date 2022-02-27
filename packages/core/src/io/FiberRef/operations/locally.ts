import type { Effect } from "../../Effect"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition/concrete"

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 *
 * @tsplus fluent ets/XFiberRef locally
 * @tsplus fluent ets/XFiberRefRuntime locally
 */
export function locally_<EA, EB, A, B>(
  self: XFiberRef<EA, EB, A, B>,
  value: A,
  __tsplusTrace?: string
): <R, EC, C>(use: Effect<R, EC, C>) => Effect<R, EA | EC, C> {
  concreteUnified(self)
  return self._locally(value)
}

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 *
 * @ets_data_first locally_
 */
export function locally<R, EC, A, C>(value: A, __tsplusTrace?: string) {
  return <EA, EB, B>(
    self: XFiberRef<EA, EB, A, B>
  ): ((use: Effect<R, EC, C>) => Effect<R, EA | EC, C>) => self.locally(value)
}
