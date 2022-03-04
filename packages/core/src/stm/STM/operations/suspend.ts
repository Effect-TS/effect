import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Suspends creation of the specified transaction lazily.
 *
 * @tsplus static ets/STMOps suspend
 */
export function suspend<R, E, A>(f: LazyArg<STM<R, E, A>>): STM<R, E, A> {
  return STM.succeed(f).flatten()
}
