import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Runs an effect when the supplied partial function matches for the given
 * value, otherwise does nothing.
 *
 * @tsplus static ets/EffectOps whenCase
 */
export function whenCase<R, E, A, B>(
  a: LazyArg<A>,
  pf: (a: A) => Option<Effect<R, E, B>>,
  __etsTrace?: string
): Effect<R, E, Option<B>> {
  return Effect.suspendSucceed(
    pf(a())
      .map((effect) => effect.asSome())
      .getOrElse(Effect.none)
  )
}
