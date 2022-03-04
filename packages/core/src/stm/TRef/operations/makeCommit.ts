import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../../io/Effect"
import { TRef } from "../definition"

/**
 * Makes a new `XTRef` that is initialized to the specified value.
 *
 * @tsplus static ets/XTRefOps makeCommit
 */
export function makeCommit<A>(a: LazyArg<A>): UIO<TRef<A>> {
  return TRef.make(a).commit()
}
