import type { LazyArg } from "../../../data/Function"
import type { RuntimeConfig } from "../../RuntimeConfig"
import { Managed } from "../definition"

/**
 * Runs this managed effect on the specified runtime configuration,
 * guaranteeing that this managed effect as well as managed effects that are
 * composed sequentially after it will be run on the specified runtime
 * configuration.
 *
 * @ets fluent ets/Managed withRuntimeConfig
 */
export function withRuntimeConfig_<R, E, A>(
  self: Managed<R, E, A>,
  runtimeConfig: LazyArg<RuntimeConfig>,
  __etsTrace?: string
): Managed<R, E, A> {
  return Managed.fromRuntimeConfig(runtimeConfig).zipRight(self)
}

/**
 * Runs this managed effect on the specified runtime configuration,
 * guaranteeing that this managed effect as well as managed effects that are
 * composed sequentially after it will be run on the specified runtime
 * configuration.
 *
 * @ets_data_first withRuntimeConfig_
 */
export function withRuntimeConfig(
  runtimeConfig: LazyArg<RuntimeConfig>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, A> =>
    withRuntimeConfig_(self, runtimeConfig)
}
