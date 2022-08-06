/**
 * Continue with the returned computation if the `PartialFunction` matches,
 * translating the successful match into a failure, otherwise continue with
 * our held value.
 *
 * @tsplus static effect/core/stm/STM.Aspects rejectSTM
 * @tsplus pipeable effect/core/stm/STM rejectSTM
 */
export function rejectSTM<A, R1, E1>(pf: (a: A) => Maybe<STM<R1, E1, E1>>) {
  return <R, E>(self: STM<R, E, A>): STM<R | R1, E | E1, A> =>
    self.flatMap((a) =>
      pf(a).fold(
        () => STM.succeed(a),
        (effect) => effect.flatMap(STM.failNow)
      )
    )
}
