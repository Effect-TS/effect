import type { LazyArg } from "../../../data/Function"
import type { STM } from "../definition"
import { STMSucceed } from "../definition"

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @tsplus static ets/STMOps succeed
 */
export function succeed<A>(a: LazyArg<A>): STM<unknown, never, A> {
  return new STMSucceed(a)
}
