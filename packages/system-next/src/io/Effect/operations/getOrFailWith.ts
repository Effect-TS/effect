import * as O from "../../../data/Option"
import type { IO } from "../definition"
import { fail } from "./fail"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Lifts an `Option` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @ets static ets/EffectOps getOrFailWith
 */
export function getOrFailWith_<E, A>(
  v: O.Option<A>,
  e: () => E,
  __etsTrace?: string
): IO<E, A> {
  return suspendSucceed(() => O.fold_(v, () => fail(e), succeedNow), __etsTrace)
}

/**
 * Lifts an `Option` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @ets_data_first getOrFailWith_
 */
export function getOrFailWith<E>(e: () => E, __etsTrace?: string) {
  return <A>(v: O.Option<A>): IO<E, A> => getOrFailWith_(v, e, __etsTrace)
}
