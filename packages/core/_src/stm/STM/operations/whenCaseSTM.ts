/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static ets/STM/Ops whenCaseSTM
 */
export function whenCaseSTM<R, E, A, R1, E1, B>(
  a: LazyArg<STM<R, E, A>>,
  pf: (a: A) => Maybe<STM<R1, E1, B>>,
  __tsplusTrace?: string
): STM<R | R1, E | E1, Maybe<B>> {
  return STM.suspend(a().flatMap((a) => STM.whenCase(a, pf)))
}
