import type { FiberId } from "../../FiberId"
import type { RuntimeConfig } from "../../RuntimeConfig"
import type { Effect } from "../definition"
import { ISuspendWith } from "../definition"

/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. The effect must not throw any exceptions. When no environment is
 * required (i.e., when `R == unknown`) it is conceptually equivalent to
 * `flatten(succeed(effect))`. If you wonder if the effect throws
 * exceptions, do not use this method, use `suspend`.
 *
 * @tsplus static ets/EffectOps suspendSucceedWith
 */
export function suspendSucceedWith<R, E, A>(
  f: (runtimeConfig: RuntimeConfig, fiberId: FiberId) => Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, A> {
  return new ISuspendWith(f, __etsTrace)
}
