import type { LazyArg } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * The moral equivalent of `if (p) exp`.
 *
 * @tsplus static ets/EffectOps when
 */
export function when<R, E, A>(
  predicate: LazyArg<boolean>,
  effect: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, Option<A>> {
  return Effect.suspendSucceed(
    predicate() ? effect.map(Option.some) : Effect.succeedNow(Option.none)
  )
}
