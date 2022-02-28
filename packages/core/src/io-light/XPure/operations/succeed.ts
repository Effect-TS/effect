import type { LazyArg } from "../../../data/Function"
import type { XPure } from "../definition"
import { Succeed } from "../definition"

/**
 * Constructs a computation that always succeeds with the specified value,
 * passing the state through unchanged.
 *
 * @tsplus static ets/XPureOps succeed
 */
export function succeed<S, A>(a: LazyArg<A>): XPure<never, S, S, unknown, never, A> {
  return new Succeed(a)
}
