import { IFold } from "@effect/core/io/Effect/definition/primitives"

/**
 * A more powerful version of `foldEffect` that allows recovering from any kind
 * of failure except interruptions.
 *
 * @tsplus fluent ets/Effect foldCauseEffect
 */
export function foldCauseEffect_<R, E, A, R2, E2, A2, R3, E3, A3>(
  self: Effect<R, E, A>,
  failure: (cause: Cause<E>) => Effect<R2, E2, A2>,
  success: (a: A) => Effect<R3, E3, A3>,
  __tsplusTrace?: string
): Effect<R & R2 & R3, E2 | E3, A2 | A3> {
  return new IFold(self, failure, success, __tsplusTrace)
}

/**
 * A more powerful version of `foldEffect` that allows recovering from any kind
 * of failure except interruptions.
 *
 * @tsplus static ets/Effect/Aspects foldCauseEffect
 */
export const foldCauseEffect = Pipeable(foldCauseEffect_)
