import type { Effect } from "../../Effect"
import { IFiberRefLocally } from "../../Effect/definition/primitives"
import type { FiberRef } from "../definition"

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 *
 * @tsplus fluent ets/FiberRef locally
 */
export function locally_<A>(self: FiberRef<A>, value: A, __tsplusTrace?: string) {
  return <R, E, B>(use: Effect<R, E, B>): Effect<R, E, B> =>
    new IFiberRefLocally(value, self, use, __tsplusTrace)
}

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 */
export const locally = Pipeable(locally_)
