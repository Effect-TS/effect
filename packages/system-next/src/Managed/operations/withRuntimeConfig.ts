import type { RuntimeConfig } from "../../RuntimeConfig"
import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { acquireRelease_ } from "./acquireRelease"
import { chain_ } from "./chain"
import { fromEffect } from "./fromEffect"

/**
 * Returns a managed effect that describes setting the runtime configuration
 * to the specified value as the `acquire` action and setting it back to the
 * original runtime configuration as the `release` action.
 */
export function withRuntimeConfig(
  runtimeConfig: RuntimeConfig,
  __trace?: string
): Managed<unknown, never, void> {
  return chain_(
    fromEffect(T.runtimeConfig),
    (currentRuntimeConfig) =>
      acquireRelease_(
        T.setRuntimeConfig(runtimeConfig),
        T.setRuntimeConfig(currentRuntimeConfig)
      ),
    __trace
  )
}
