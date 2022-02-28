import type { LazyArg } from "../../../data/Function"
import type { XPure } from "../definition"
import { Suspend } from "../definition"

/**
 * Suspend a computation, useful in recursion.
 *
 * @tsplus static ets/XPureOps suspend
 */
export function suspend<W, S1, S2, R, E, A>(
  f: LazyArg<XPure<W, S1, S2, R, E, A>>
): XPure<W, S1, S2, R, E, A> {
  return new Suspend(f)
}
