import type { LazyArg } from "../../../data/Function"
import type { RuntimeConfig } from "../../RuntimeConfig"
import type { UIO } from "../definition"
import { Effect, ISetRuntimeConfig } from "../definition"

/**
 * Retrieves the `RuntimeConfig` that this effect is running on.
 *
 * @tsplus static ets/EffectOps runtimeConfig
 */
export const runtimeConfig: UIO<RuntimeConfig> = Effect.suspendSucceedWith(
  (runtimeConfig) => Effect.succeedNow(runtimeConfig)
)

/**
 * Sets the runtime configuration to the specified value.
 *
 * @tsplus static ets/EffectOps setRuntimeConfig
 */
export function setRuntimeConfig(
  runtimeConfig: LazyArg<RuntimeConfig>,
  __etsTrace?: string
): UIO<void> {
  return new ISetRuntimeConfig(runtimeConfig, __etsTrace)
}
