import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * Lifts an `Option` into a `STM`.
 *
 * @tsplus static ets/STMOps fromOption
 */
export function fromOption<A>(
  option: LazyArg<Option<A>>
): STM<unknown, Option<never>, A> {
  return STM.suspend(option().fold(STM.fail(Option.none), STM.succeedNow))
}
