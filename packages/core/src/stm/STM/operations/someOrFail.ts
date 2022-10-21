/**
 * Extracts the optional value, or fails with the given error 'e'.
 *
 * @tsplus static effect/core/stm/STM.Aspects someOrFail
 * @tsplus pipeable effect/core/stm/STM someOrFail
 */
export function someOrFail<E2>(orFail: LazyArg<E2>) {
  return <R, E, A>(self: STM<R, E, Maybe<A>>): STM<R, E | E2, A> =>
    self.flatMap((option) =>
      option.fold(
        STM.sync(orFail).flatMap(STM.fail),
        STM.succeed
      )
    )
}
