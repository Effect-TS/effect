import type { LazyArg } from "../../../data/Function"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise
 *
 * For effectful conditionals, see `ifEffect`.
 *
 * @tsplus static ets/EffectOps cond
 */
export function cond_<E, A>(
  predicate: LazyArg<boolean>,
  result: LazyArg<A>,
  error: LazyArg<E>,
  __tsplusTrace?: string
): IO<E, A> {
  return Effect.suspendSucceed(() =>
    predicate() ? Effect.succeed(result) : Effect.fail(error)
  )
}

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise
 *
 * For effectful conditionals, see `ifEffect`.
 *
 * @ets_data_first cond_
 */
export function cond<E, A>(
  result: LazyArg<A>,
  error: LazyArg<E>,
  __tsplusTrace?: string
) {
  return (predicate: LazyArg<boolean>): IO<E, A> =>
    Effect.cond(predicate, result, error)
}
