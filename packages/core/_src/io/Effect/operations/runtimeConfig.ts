/**
 * Retrieves the `RuntimeConfig` that this effect is running on.
 *
 * @tsplus static effect/core/io/Effect.Ops runtimeConfig
 */
export const runtimeConfig: Effect<never, never, RuntimeConfig> = Effect.suspendSucceedWith(
  (runtimeConfig, _) => Effect.succeedNow(runtimeConfig)
)
