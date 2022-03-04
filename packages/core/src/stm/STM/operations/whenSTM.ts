import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @tsplus static ets/STMOps whenSTM
 */
export function whenSTM<R, E, R1, E1, A>(
  predicate: LazyArg<STM<R, E, boolean>>,
  effect: LazyArg<STM<R1, E1, A>>
): STM<R & R1, E | E1, Option<A>> {
  return STM.suspend(predicate).flatMap((b) => (b ? effect().asSome() : STM.none))
}
