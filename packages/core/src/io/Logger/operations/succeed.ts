import type { LazyArg } from "../../../data/Function"
import { Logger } from "../definition"

/**
 * @tsplus static ets/LoggerOps succeed
 */
export function succeed<A>(a: LazyArg<A>): Logger<unknown, A> {
  return Logger.simple(a)
}
