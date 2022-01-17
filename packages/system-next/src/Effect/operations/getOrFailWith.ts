import * as O from "../../Option"
import type { IO } from "../definition"
import { fail } from "./fail"
import { succeedNow } from "./succeedNow"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Lifts an `Option` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 */
export function getOrFailWith_<E, A>(
  v: O.Option<A>,
  e: () => E,
  __trace?: string
): IO<E, A> {
  return suspendSucceed(() => O.fold_(v, () => fail(e), succeedNow), __trace)
}

/**
 * Lifts an `Option` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @ets_data_first getOrFailWith_
 */
export function getOrFailWith<E>(e: () => E, __trace?: string) {
  return <A>(v: O.Option<A>): IO<E, A> => getOrFailWith_(v, e, __trace)
}
