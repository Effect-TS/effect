// ets_tracing: off

import type { RuntimeConfig } from "../../RuntimeConfig"
import type { UIO } from "../definition"
import { ISetRuntimeConfig } from "../definition"
import { succeedNow } from "./succeedNow"
import { suspendSucceedWith } from "./suspendSucceedWith"

/**
 * Retrieves the `RuntimeConfig` that this effect is running on.
 */
export const runtimeConfig: UIO<RuntimeConfig> = suspendSucceedWith((runtimeConfig) =>
  succeedNow(runtimeConfig)
)

/**
 * Sets the runtime configuration to the specified value.
 */
export function setRuntimeConfig(
  runtimeConfig: RuntimeConfig,
  __trace?: string
): UIO<void> {
  return new ISetRuntimeConfig(runtimeConfig, __trace)
}
