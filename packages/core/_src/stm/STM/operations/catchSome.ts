/**
 * Recovers from some or all of the error cases.
 *
 * @tsplus static effect/core/stm/STM.Aspects catchSome
 * @tsplus pipeable effect/core/stm/STM catchSome
 */
export function catchSome<E, R1, E1, B>(
  f: (e: E) => Maybe<STM<R1, E1, B>>
) {
  return <R, A>(self: STM<R, E, A>): STM<R1 | R, E | E1, A | B> =>
    self.catchAll((e): STM<R1, E | E1, A | B> => f(e).fold(STM.fail(e), identity))
}
