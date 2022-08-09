import { ISetRuntimeConfig } from "@effect/core/io/Effect/definition/primitives"

/**
 * Sets the runtime configuration to the specified value.
 *
 * @tsplus static effect/core/io/Effect.Ops setRuntimeConfig
 */
export function setRuntimeConfig(runtimeConfig: RuntimeConfig): Effect<never, never, void> {
  return new ISetRuntimeConfig(runtimeConfig)
}
