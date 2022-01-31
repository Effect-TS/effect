import * as O from "../../../data/Option"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Lifts an `Option` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @tsplus static ets/EffectOps getOrFailWith
 */
export function getOrFailWith_<E, A>(
  v: O.Option<A>,
  e: () => E,
  __etsTrace?: string
): IO<E, A> {
  return Effect.suspendSucceed(() =>
    O.fold_(v, () => Effect.fail(e), Effect.succeedNow)
  )
}

/**
 * Lifts an `Option` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @ets_data_first getOrFailWith_
 */
export function getOrFailWith<E>(e: () => E, __etsTrace?: string) {
  return <A>(v: O.Option<A>): IO<E, A> => getOrFailWith_(v, e)
}
