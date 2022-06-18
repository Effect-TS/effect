/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @tsplus fluent ets/STM unlessSTM
 */
export function unlessSTM_<R, E, A, R2, E2>(
  self: STM<R, E, A>,
  predicate: LazyArg<STM<R2, E2, boolean>>
): STM<R | R2, E | E2, Maybe<A>> {
  return STM.suspend(predicate().flatMap((b) => (b ? STM.none : self.asSome)))
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @tsplus static ets/STM/Aspects unlessSTM
 */
export const unlessSTM = Pipeable(unlessSTM_)
