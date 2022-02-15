import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @tsplus static ets/EffectOps when
 */
export function when<R, E, A>(
  self: Effect<R, E, A>,
  predicate: LazyArg<boolean>,
  __etsTrace?: string
): Effect<R, E, Option<A>> {
  return Effect.suspendSucceed(
    predicate() ? self.map(Option.some) : Effect.succeedNow(Option.none)
  )
}
