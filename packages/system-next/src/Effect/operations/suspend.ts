import { fail } from "../../Exit"
import type { Effect } from "../definition"
import { EffectError } from "../definition"
import { suspendSucceedWith } from "./suspendSucceedWith"

/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. When no environment is required (i.e., when `R == unknown`) it is
 * conceptually equivalent to `flatten(succeed(io))`.
 */
export function suspend<R, E, A>(
  f: () => Effect<R, E, A>,
  __trace?: string
): Effect<R, unknown, A> {
  return suspendSucceedWith((runtimeConfig) => {
    try {
      return f()
    } catch (error) {
      if (!runtimeConfig.value.fatal(error)) {
        throw new EffectError(fail(error), __trace)
      }
      throw error
    }
  }, __trace)
}
