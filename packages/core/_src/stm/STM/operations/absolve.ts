/**
 * Submerges the error case of an `Either` into the `STM`. The inverse
 * operation of `STM.either`.
 *
 * @tsplus static effect/core/stm/STM.Ops absolve
 * @tsplus getter effect/core/stm/STM absolve
 */
export function absolve<R, E, E1, A>(
  self: STM<R, E, Either<E1, A>>
): STM<R, E | E1, A> {
  return self.flatMap((either) => either.fold(STM.fail, STM.succeed))
}
