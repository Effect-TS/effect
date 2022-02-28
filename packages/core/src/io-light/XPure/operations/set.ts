import { Tuple } from "../../../collection/immutable/Tuple"
import { XPure } from "../definition"
/**
 * Constructs a computation from the specified modify function.
 *
 * @tsplus static ets/XPureOps set
 */
export function set<S>(s: S): XPure<never, unknown, S, unknown, never, void> {
  return XPure.modify(() => Tuple<[S, void]>(s, undefined))
}
