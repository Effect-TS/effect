import type { Tuple } from "../../../collection/immutable/Tuple"
import type { XPure } from "../definition"
import { Modify } from "../definition"

/**
 * Constructs a computation from the specified modify function.
 *
 * @tsplus static ets/XPureOps modify
 */
export function modify<S1, S2, A>(
  f: (s: S1) => Tuple<[S2, A]>
): XPure<never, S1, S2, unknown, never, A> {
  return new Modify(f)
}
