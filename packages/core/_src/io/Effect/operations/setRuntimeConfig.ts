import { ISetRuntimeConfig } from "@effect-ts/core/io/Effect/definition/primitives";

/**
 * Sets the runtime configuration to the specified value.
 *
 * @tsplus static ets/Effect/Ops setRuntimeConfig
 */
export function setRuntimeConfig(
  runtimeConfig: LazyArg<RuntimeConfig>,
  __tsplusTrace?: string
): UIO<void> {
  return new ISetRuntimeConfig(runtimeConfig, __tsplusTrace);
}
