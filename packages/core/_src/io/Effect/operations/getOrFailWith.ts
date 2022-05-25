/**
 * Lifts an `Option` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @tsplus static ets/Effect/Ops getOrFailWith
 */
export function getOrFailWith<E, A>(
  option: LazyArg<Option<A>>,
  e: LazyArg<E>,
  __tsplusTrace?: string
): Effect.IO<E, A> {
  return Effect.suspendSucceed(option().fold(Effect.fail(e), Effect.succeedNow))
}
