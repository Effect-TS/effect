import { Effect } from "../../Effect"
import type { RuntimeConfig } from "../../RuntimeConfig"
import { Managed } from "../definition"

/**
 * Retrieves the current runtime configuration.
 *
 * @tsplus static ets/ManagedOps runtimeConfig
 */
export const runtimeConfig: Managed<unknown, never, RuntimeConfig> = Managed.fromEffect(
  Effect.runtimeConfig
)
