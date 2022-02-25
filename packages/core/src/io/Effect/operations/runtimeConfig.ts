import type { RuntimeConfig } from "../../RuntimeConfig"
import type { UIO } from "../definition"
import { Effect } from "../definition"

/**
 * Retrieves the `RuntimeConfig` that this effect is running on.
 *
 * @tsplus static ets/EffectOps runtimeConfig
 */
export const runtimeConfig: UIO<RuntimeConfig> = Effect.suspendSucceedWith(
  (runtimeConfig, _) => Effect.succeedNow(runtimeConfig)
)
