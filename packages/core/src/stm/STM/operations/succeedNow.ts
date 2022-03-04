import type { STM } from "../definition"
import { STMSucceedNow } from "../definition"

/**
 * Returns an `STM` effect that succeeds with the specified value.
 *
 * @tsplus static ets/STMOps succeedNow
 */
export function succeedNow<A>(a: A): STM<unknown, never, A> {
  return new STMSucceedNow(a)
}
