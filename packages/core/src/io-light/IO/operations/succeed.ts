import type { LazyArg } from "../../../data/Function"
import type { IO } from "../definition"
import { Succeed } from "../definition"

/**
 * Lift a sync (non failable) computation.
 *
 * @tsplus static ets/IOOps succeed
 */
export function succeed<A>(a: LazyArg<A>): IO<A> {
  return new Succeed(a)
}
