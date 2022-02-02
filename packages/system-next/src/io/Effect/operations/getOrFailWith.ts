import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import type { IO } from "../definition"
import { Effect } from "../definition"

/**
 * Lifts an `Option` into an `Effect`. If the option is not defined, fail with
 * the specified `e` value.
 *
 * @tsplus static ets/EffectOps getOrFailWith
 */
export function getOrFailWith<E, A>(
  option: LazyArg<Option<A>>,
  e: LazyArg<E>,
  __etsTrace?: string
): IO<E, A> {
  return Effect.suspendSucceed(option().fold(Effect.fail(e), Effect.succeedNow))
}
