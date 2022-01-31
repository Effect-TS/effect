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
  predicate: () => boolean,
  result: () => A,
  error: () => E,
  __etsTrace?: string
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
export function cond<E, A>(result: () => A, error: () => E, __etsTrace?: string) {
  return (predicate: () => boolean): IO<E, A> => cond_(predicate, result, error)
}
