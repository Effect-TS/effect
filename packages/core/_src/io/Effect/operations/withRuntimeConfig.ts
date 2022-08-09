/**
 * Runs the specified effect on the specified runtime configuration, restoring
 * the old runtime configuration when it completes execution.
 *
 * @tsplus static effect/core/io/Effect.Ops withRuntimeConfig
 * @tsplus fluent effect/core/io/Effect withRuntimeConfig
 */
export function withRuntimeConfig<R, E, A>(
  self: Effect<R, E, A>,
  runtimeConfig: RuntimeConfig
): Effect<R, E, A> {
  return Effect.runtimeConfig.flatMap((currentRuntimeConfig) =>
    Effect.acquireUseReleaseDiscard(
      Effect.setRuntimeConfig(runtimeConfig).zipRight(Effect.yieldNow),
      self,
      Effect.setRuntimeConfig(currentRuntimeConfig)
    )
  )
}
