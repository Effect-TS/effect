import { Effect } from "../../Effect"
import type { RuntimeConfig } from "../../RuntimeConfig"
import { Managed } from "../definition"

/**
 * Returns a managed effect that describes setting the runtime configuration
 * to the specified value as the `acquire` action and setting it back to the
 * original runtime configuration as the `release` action.
 *
 * @ets static ets/ManagedOps withRuntimeConfig
 */
export function withRuntimeConfig(
  runtimeConfig: RuntimeConfig,
  __etsTrace?: string
): Managed<unknown, never, void> {
  return Managed.fromEffect(Effect.runtimeConfig).flatMap((currentRuntimeConfig) =>
    Managed.acquireRelease(
      Effect.setRuntimeConfig(runtimeConfig),
      Effect.setRuntimeConfig(currentRuntimeConfig)
    )
  )
}
