/**
 * Lifts an `Option` into a `STM`.
 *
 * @tsplus static ets/STM/Ops fromOption
 */
export function fromOption<A>(
  option: LazyArg<Option<A>>
): STM<never, Option<never>, A> {
  return STM.suspend(option().fold(STM.fail(Option.none), STM.succeedNow))
}
