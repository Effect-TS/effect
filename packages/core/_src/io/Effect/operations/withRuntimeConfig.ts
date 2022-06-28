/**
 * Runs the specified effect on the specified runtime configuration, restoring
 * the old runtime configuration when it completes execution.
 *
 * @tsplus static effect/core/io/Effect.Ops withRuntimeConfig
 */
export function withRuntimeConfig<R, E, A>(
  runtimeConfig: LazyArg<RuntimeConfig>,
  effect: LazyArg<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.runtimeConfig.flatMap((currentRuntimeConfig) =>
    Effect.acquireUseReleaseDiscard(
      Effect.setRuntimeConfig(runtimeConfig).zipRight(Effect.yieldNow),
      effect,
      Effect.setRuntimeConfig(currentRuntimeConfig)
    )
  )
}

/**
 * Runs the specified effect on the specified runtime configuration, restoring
 * the old runtime configuration when it completes execution.
 *
 * @tsplus static effect/core/io/Effect.Aspects withRuntimeConfig
 * @tsplus pipeable effect/core/io/Effect withRuntimeConfig
 */
export function withRuntimeConfigNow(
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => withRuntimeConfig(runtimeConfig, self)
}
