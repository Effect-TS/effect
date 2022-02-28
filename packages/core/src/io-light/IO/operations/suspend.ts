import type { LazyArg } from "../../../data/Function"
import type { IO } from "../definition"
import { Suspend } from "../definition"

/**
 * Suspend a computation, useful in recursion.
 *
 * @tsplus static ets/IOOps suspend
 */
export function suspend<A>(f: LazyArg<IO<A>>): IO<A> {
  return new Suspend(f)
}
