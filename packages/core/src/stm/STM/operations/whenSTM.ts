import type { Option } from "@fp-ts/data/Option"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @tsplus static effect/core/stm/STM.Ops whenSTM
 * @category mutations
 * @since 1.0.0
 */
export function whenSTM<R, E, R1, E1, A>(
  predicate: STM<R, E, boolean>,
  effect: STM<R1, E1, A>
): STM<R | R1, E | E1, Option<A>> {
  return predicate.flatMap((b) => (b ? effect.asSome : STM.none))
}
