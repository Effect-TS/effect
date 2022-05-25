/**
 * Runs the specified effect on the specified runtime configuration, restoring
 * the old runtime configuration when it completes execution.
 *
 * @tsplus static ets/Effect/Ops withRuntimeConfig
 */
export function withRuntimeConfig<R, E, A>(
  runtimeConfig: LazyArg<RuntimeConfig>,
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.runtimeConfig.flatMap((currentRuntimeConfig) =>
    Effect.acquireUseReleaseDiscard(
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
 * @tsplus static ets/Effect/Aspects withRuntimeConfig
 */
export const withRuntimeConfigNow = Pipeable(withRuntimeConfigNow_)
