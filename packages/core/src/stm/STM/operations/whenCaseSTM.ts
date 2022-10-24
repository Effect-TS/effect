import type { Option } from "@fp-ts/data/Option"

/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static effect/core/stm/STM.Ops whenCaseSTM
 * @category mutations
 * @since 1.0.0
 */
export function whenCaseSTM<R, E, A, R1, E1, B>(
  stm: STM<R, E, A>,
  pf: (a: A) => Option<STM<R1, E1, B>>
): STM<R | R1, E | E1, Option<B>> {
  return stm.flatMap((a) => STM.whenCase(a, pf))
}
