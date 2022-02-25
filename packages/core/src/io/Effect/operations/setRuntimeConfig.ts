import type { LazyArg } from "../../../data/Function"
import type { RuntimeConfig } from "../../RuntimeConfig"
import type { UIO } from "../definition"
import { ISetRuntimeConfig } from "../definition"

/**
 * Sets the runtime configuration to the specified value.
 *
 * @tsplus static ets/EffectOps setRuntimeConfig
 */
export function setRuntimeConfig(
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
): UIO<void> {
  return new ISetRuntimeConfig(runtimeConfig, __tsplusTrace)
}
