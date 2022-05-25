import { ISetRuntimeConfig } from "@effect/core/io/Effect/definition/primitives"

/**
 * Sets the runtime configuration to the specified value.
 *
 * @tsplus static ets/Effect/Ops setRuntimeConfig
 */
export function setRuntimeConfig(
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
): Effect.UIO<void> {
  return Effect.suspendSucceed(new ISetRuntimeConfig(runtimeConfig(), __tsplusTrace))
}
