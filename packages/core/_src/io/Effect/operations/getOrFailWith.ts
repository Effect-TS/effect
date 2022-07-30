/**
 * Lifts an `Maybe` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @tsplus static effect/core/io/Effect.Ops getOrFailWith
 */
export function getOrFailWith<E, A>(
  option: LazyArg<Maybe<A>>,
  e: LazyArg<E>,
  __tsplusTrace?: string
): Effect<never, E, A> {
  return Effect.suspendSucceed(option().fold(Effect.failSync(e), Effect.succeed))
}
