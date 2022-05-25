import { IFiberRefLocally } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 *
 * @tsplus fluent ets/FiberRef locally
 */
export function locally_<A, P>(self: FiberRef<A, P>, value: A, __tsplusTrace?: string) {
  return <R, E, B>(use: Effect<R, E, B>): Effect<R, E, B> => new IFiberRefLocally(value, self, use, __tsplusTrace)
}

/**
 * Returns an `Effect` that runs with `value` bound to the current fiber.
 *
 * Guarantees that fiber data is properly restored via `acquireRelease`.
 *
 * @tsplus static ets/FiberRef/Aspects locally
 */
export const locally = Pipeable(locally_)
