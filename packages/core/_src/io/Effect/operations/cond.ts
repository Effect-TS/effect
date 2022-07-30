/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise
 *
 * For effectful conditionals, see `ifEffect`.
 *
 * @tsplus static effect/core/io/Effect.Ops cond
 */
export function cond<E, A>(
  predicate: LazyArg<boolean>,
  result: LazyArg<A>,
  error: LazyArg<E>,
  __tsplusTrace?: string
): Effect<never, E, A> {
  return Effect.suspendSucceed(() => predicate() ? Effect.sync(result) : Effect.failSync(error))
}
