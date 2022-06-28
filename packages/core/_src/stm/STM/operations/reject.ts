/**
 * Fail with the returned value if the `PartialFunction` matches, otherwise
 * continue with our held value.
 *
 * @tsplus static effect/core/stm/STM.Aspects reject
 * @tsplus pipeable effect/core/stm/STM reject
 */
export function reject<A, E1>(pf: (a: A) => Maybe<E1>) {
  return <R, E>(self: STM<R, E, A>): STM<R, E | E1, A> =>
    self.rejectSTM(
      (a) => pf(a).map(STM.failNow)
    )
}
