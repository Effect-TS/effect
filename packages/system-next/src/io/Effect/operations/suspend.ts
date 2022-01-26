import type { LazyArg } from "../../../data/Function"
import { fail as exitFail } from "../../Exit"
import { Effect, EffectError } from "../definition"

/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. When no environment is required (i.e., when `R == unknown`) it is
 * conceptually equivalent to `flatten(succeed(io))`.
 *
 * @ets static ets/EffectOps suspend
 */
export function suspend<R, E, A>(
  f: LazyArg<Effect<R, E, A>>,
  __etsTrace?: string
): Effect<R, unknown, A> {
  return Effect.suspendSucceedWith((runtimeConfig) => {
    try {
      return f()
    } catch (error) {
      if (!runtimeConfig.value.fatal(error)) {
        throw new EffectError(exitFail(error), __etsTrace)
      }
      throw error
    }
  })
}
