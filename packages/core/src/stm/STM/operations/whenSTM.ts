/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects.
 *
 * @tsplus static effect/core/stm/STM.Ops whenSTM
 */
export function whenSTM<R, E, R1, E1, A>(
  predicate: STM<R, E, boolean>,
  effect: STM<R1, E1, A>
): STM<R | R1, E | E1, Maybe<A>> {
  return predicate.flatMap((b) => (b ? effect.asSome : STM.none))
}
