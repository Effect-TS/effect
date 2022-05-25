import { IFlatMap } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 *
 * @tsplus fluent ets/Effect flatMap
 */
export function flatMap_<R, E, A, R1, E1, B>(
  self: Effect<R, E, A>,
  f: (a: A) => Effect<R1, E1, B>,
  __tsplusTrace?: string
): Effect<R & R1, E | E1, B> {
  return new IFlatMap(self, f, __tsplusTrace)
}

/**
 * Returns an effect that models the execution of this effect, followed by the
 * passing of its value to the specified continuation function `k`, followed
 * by the effect that it returns.
 *
 * @tsplus static ets/Effect/Aspects flatMap
 */
export const flatMap = Pipeable(flatMap_)
