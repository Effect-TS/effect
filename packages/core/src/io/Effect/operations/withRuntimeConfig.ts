import type { LazyArg } from "../../../data/Function"
import type { RuntimeConfig } from "../../RuntimeConfig"
import { Effect } from "../definition"

/**
 * Runs the specified effect on the specified runtime configuration, restoring
 * the old runtime configuration when it completes execution.
 *
 * @tsplus static ets/EffectOps withRuntimeConfig
 */
export function withRuntimeConfig<R, E, A>(
  runtimeConfig: LazyArg<RuntimeConfig>,
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.runtimeConfig.flatMap((currentRuntimeConfig) =>
    Effect.acquireRelease(
      Effect.setRuntimeConfig(runtimeConfig) > Effect.yieldNow,
      effect,
      Effect.setRuntimeConfig(currentRuntimeConfig)
    )
  )
}

/**
 * Runs the specified effect on the specified runtime configuration, restoring
 * the old runtime configuration when it completes execution.
 *
 * @tsplus fluent ets/Effect withRuntimeConfig
 */
export function withRuntimeConfigNow_<R, E, A>(
  self: Effect<R, E, A>,
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return withRuntimeConfig(runtimeConfig, self)
}

/**
 * Runs the specified effect on the specified runtime configuration, restoring
 * the old runtime configuration when it completes execution.
 *
 * @ets_data_first withRuntimeConfigNow_
 */
export function withRuntimeConfigNow(
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    self.withRuntimeConfig(runtimeConfig)
}
