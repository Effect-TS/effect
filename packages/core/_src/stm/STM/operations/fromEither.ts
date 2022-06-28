/**
 * Lifts an `Either` into a `STM`.
 *
 * @tsplus static effect/core/stm/STM.Ops fromEither
 */
export function fromEither<E, A>(e: LazyArg<Either<E, A>>): STM<never, E, A> {
  return STM.suspend(() => {
    return e().fold(STM.failNow, STM.succeedNow)
  })
}
