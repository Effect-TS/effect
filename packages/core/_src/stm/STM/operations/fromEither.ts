/**
 * Lifts an `Either` into a `STM`.
 *
 * @tsplus static effect/core/stm/STM.Ops fromEither
 */
export function fromEither<E, A>(e: Either<E, A>): STM<never, E, A> {
  return STM.suspend(e.fold(STM.fail, STM.succeed))
}
