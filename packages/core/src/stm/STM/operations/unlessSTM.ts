import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { STM } from "../definition"

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @tsplus fluent ets/STM unlessSTM
 */
export function unlessSTM_<R, E, A, R2, E2>(
  self: STM<R, E, A>,
  predicate: LazyArg<STM<R2, E2, boolean>>
): STM<R & R2, E | E2, Option<A>> {
  return STM.suspend(predicate().flatMap((b) => (b ? STM.none : self.asSome())))
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @ets_data_first unlessSTM_
 */
export function unlessSTM<R2, E2>(predicate: LazyArg<STM<R2, E2, boolean>>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R & R2, E | E2, Option<A>> =>
    self.unlessSTM(predicate)
}
