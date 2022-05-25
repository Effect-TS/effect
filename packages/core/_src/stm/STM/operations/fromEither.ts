/**
 * Lifts an `Either` into a `STM`.
 *
 * @tsplus static ets/STM/Ops fromEither
 */
export function fromEither<E, A>(e: LazyArg<Either<E, A>>): STM<unknown, E, A> {
  return STM.suspend(() => {
    return e().fold(STM.failNow, STM.succeedNow)
  })
}
