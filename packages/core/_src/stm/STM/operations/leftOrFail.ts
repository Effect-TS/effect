/**
 * Returns a successful effect if the value is `Left`, or fails with the error e.
 *
 * @tsplus static effect/core/stm/STM.Aspects leftOrFail
 * @tsplus pipeable effect/core/stm/STM leftOrFail
 */
export function leftOrFail<C, E1>(orFail: (c: C) => E1) {
  return <R, E, B>(self: STM<R, E, Either<B, C>>): STM<R, E | E1, B> =>
    self.flatMap((_) => _.fold(STM.succeed, (x) => STM.fail(orFail(x))))
}
