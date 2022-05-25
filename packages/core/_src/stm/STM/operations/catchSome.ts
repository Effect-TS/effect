/**
 * Recovers from some or all of the error cases.
 *
 * @tsplus fluent ets/STM catchSome
 */
export function catchSome_<R, E, A, R1, E1, B>(
  self: STM<R, E, A>,
  f: (e: E) => Option<STM<R1, E1, B>>
): STM<R1 & R, E | E1, A | B> {
  return self.catchAll((e): STM<R1, E | E1, A | B> => f(e).fold(STM.fail(e), identity))
}

/**
 * Recovers from some or all of the error cases.
 *
 * @tsplus static ets/STM/Aspects catchSome
 */
export const catchSome = Pipeable(catchSome_)
