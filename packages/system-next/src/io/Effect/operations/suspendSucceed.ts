import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../definition"
import { ISuspend } from "../definition"

/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. The effect must not throw any exceptions. When no environment is
 * required (i.e., when `R == unknown`) it is conceptually equivalent to
 * `flatten(succeed(effect))`. If you wonder if the effect throws
 * exceptions, do not use this method, use `suspend`.
 *
 * @tsplus static ets/EffectOps suspendSucceed
 */
export function suspendSucceed<R, E, A>(
  f: LazyArg<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, E, A> {
  return new ISuspend(f, __etsTrace)
}
