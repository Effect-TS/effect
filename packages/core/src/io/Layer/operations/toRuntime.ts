import { Effect } from "../../Effect"
import { Runtime } from "../../Runtime"
import type { RuntimeConfig } from "../../RuntimeConfig"
import type { HasScope } from "../../Scope"
import type { Layer } from "../definition"

/**
 * Converts a layer that requires no services into a scoped runtime, which can
 * be used to execute effects.
 *
 * @tsplus fluent ets/Layer toRuntime
 */
export function toRuntime_<RIn, E, ROut>(
  self: Layer<RIn, E, ROut>,
  runtimeConfig: RuntimeConfig
): Effect<RIn & HasScope, E, Runtime<ROut>> {
  return Effect.scopeWith((scope) => self.buildWithScope(scope)).map(
    (environment) => new Runtime(environment, runtimeConfig)
  )
}

/**
 * Converts a layer that requires no services into a scoped runtime, which can
 * be used to execute effects.
 */
export const toRuntime = Pipeable(toRuntime_)
