import type { Managed } from "../../Managed"
import { Runtime } from "../../Runtime"
import type { RuntimeConfig } from "../../RuntimeConfig"
import type { Layer } from "../definition"

/**
 * Converts a layer that requires no services into a managed runtime, which
 * can be used to execute effects.
 *
 * @tsplus fluent ets/Layer toRuntime
 */
export function toRuntime_<R, E, A>(
  self: Layer<R, E, A>,
  runtimeConfig: RuntimeConfig
): Managed<R, E, Runtime<A>> {
  return self.build().map((a) => new Runtime(a, runtimeConfig))
}

/**
 * Converts a layer that requires no services into a managed runtime, which
 * can be used to execute effects.
 *
 * @ets_data_first toRuntime_
 */
export function toRuntime(runtimeConfig: RuntimeConfig) {
  return <R, E, A>(self: Layer<R, E, A>): Managed<R, E, Runtime<A>> =>
    self.toRuntime(runtimeConfig)
}
