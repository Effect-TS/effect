import type { Exit } from "../definition"
import { Success } from "../definition"

/**
 * @tsplus static ets/ExitOps succeed
 */
export function succeed<A>(a: A): Exit<never, A> {
  return new Success(a)
}
