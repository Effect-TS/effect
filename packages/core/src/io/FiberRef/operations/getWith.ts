import type { Effect } from "../../Effect"
import { IFiberRefWith } from "../../Effect/definition/primitives"
import type { FiberRef } from "../definition"

/**
 * Gets the value associated with the current fiber and uses it to run the
 * specified effect.
 *
 * @tsplus fluent ets/FiberRef getWith
 */
export function getWith_<R, E, A, B>(
  self: FiberRef<A>,
  f: (a: A) => Effect<R, E, B>,
  __tsplusTrace?: string
): Effect<R, E, B> {
  return new IFiberRefWith(self, f, __tsplusTrace)
}

/**
 * Gets the value associated with the current fiber and uses it to run the
 * specified effect.
 */
export const getWith = Pipeable(getWith_)
