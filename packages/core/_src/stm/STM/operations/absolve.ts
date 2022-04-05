/**
 * Submerges the error case of an `Either` into the `STM`. The inverse
 * operation of `STM.either`.
 *
 * @tsplus static ets/STM/Ops absolve
 * @tsplus fluent ets/STM absolve
 */
export function absolve<R, E, E1, A>(
  self: STM<R, E, Either<E1, A>>
): STM<R, E | E1, A> {
  return self.flatMap((either) => either.fold(STM.failNow, STM.succeedNow));
}
