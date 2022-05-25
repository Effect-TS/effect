/**
 * A combinator that runs the specified effect with the runtime configuration
 * modified with the specified function.
 *
 * @tsplus fluent ets/Effect modifyRuntimeConfig
 */
export function modifyRuntimeConfig_<R, E, A>(
  self: Effect<R, E, A>,
  f: (runtimeConfig: RuntimeConfig) => RuntimeConfig,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.runtimeConfig.flatMap((runtimeConfig) => self.withRuntimeConfig(f(runtimeConfig)))
}

/**
 * A combinator that runs the specified effect with the runtime configuration
 * modified with the specified function.
 *
 * @tsplus static ets/Effect/Aspects modifyRuntimeConfig
 */
export const modifyRuntimeConfig = Pipeable(modifyRuntimeConfig_)
