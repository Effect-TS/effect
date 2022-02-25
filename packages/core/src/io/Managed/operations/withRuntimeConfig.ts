import type { LazyArg } from "../../../data/Function"
import { Effect } from "../../Effect"
import type { RuntimeConfig } from "../../RuntimeConfig"
import { Managed } from "../definition"

/**
 * Returns a managed effect that describes setting the runtime configuration
 * to the specified value as the `acquire` action and setting it back to the
 * original runtime configuration as the `release` action.
 *
 * @tsplus static ets/ManagedOps withRuntimeConfig
 */
export function withRuntimeConfig(
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
): Managed<unknown, never, void> {
  return Managed.fromEffect(Effect.runtimeConfig).flatMap((currentRuntimeConfig) =>
    Managed.acquireRelease(
      Effect.setRuntimeConfig(runtimeConfig),
      Effect.setRuntimeConfig(currentRuntimeConfig)
    )
  )
}

/**
 * Runs this managed effect on the specified runtime configuration,
 * guaranteeing that this managed effect as well as managed effects that are
 * composed sequentially after it will be run on the specified runtime
 * configuration.
 *
 * @tsplus fluent ets/Managed withRuntimeConfig
 */
export function withRuntimeConfigNow_<R, E, A>(
  self: Managed<R, E, A>,
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
): Managed<R, E, A> {
  return Managed.fromRuntimeConfig(runtimeConfig).zipRight(self)
}

/**
 * Runs this managed effect on the specified runtime configuration,
 * guaranteeing that this managed effect as well as managed effects that are
 * composed sequentially after it will be run on the specified runtime
 * configuration.
 *
 * @ets_data_first withRuntimeConfigNow_
 */
export function withRuntimeConfigNow(
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, A> =>
    self.withRuntimeConfig(runtimeConfig)
}
