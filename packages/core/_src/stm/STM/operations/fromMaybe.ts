/**
 * Lifts an `Maybe` into a `STM`.
 *
 * @tsplus static ets/STM/Ops fromMaybe
 */
export function fromMaybe<A>(
  option: LazyArg<Maybe<A>>
): STM<never, Maybe<never>, A> {
  return STM.suspend(option().fold(STM.fail(Maybe.none), STM.succeedNow))
}
