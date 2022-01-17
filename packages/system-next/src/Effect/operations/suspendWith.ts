import { fail } from "../../Exit"
import type { FiberId } from "../../FiberId"
import type { RuntimeConfig } from "../../RuntimeConfig"
import type { RIO } from "../definition"
import { EffectError } from "../definition"
import { suspendSucceedWith } from "./suspendSucceedWith"

/**
 * Returns a lazily constructed effect, whose construction may itself require
 * effects. When no environment is required (i.e., when `R == unknown`) it is
 * conceptually equivalent to `flatten(succeedWith(io))`.
 */
export function suspendWith<R, A>(
  f: (runtimeConfig: RuntimeConfig, fiberId: FiberId) => RIO<R, A>,
  __trace?: string
): RIO<R, A> {
  return suspendSucceedWith((runtimeConfig, fiberId) => {
    try {
      return f(runtimeConfig, fiberId)
    } catch (error) {
      if (!runtimeConfig.value.fatal(error)) {
        throw new EffectError(fail(error), __trace)
      }
      throw error
    }
  }, __trace)
}
