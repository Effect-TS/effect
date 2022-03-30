import { identity } from "../../../data/Function"
import type { FiberRef } from "../definition"
import { FiberRefInternal } from "./_internal/FiberRefInternal"

/**
 * @tsplus static ets/FiberRefOps unsafeMake
 */
export function unsafeMake<A>(
  initial: A,
  fork: (a: A) => A = identity,
  join: (left: A, right: A) => A = (_, a) => a
): FiberRef<A> {
  return new FiberRefInternal(initial, fork, join)
}
