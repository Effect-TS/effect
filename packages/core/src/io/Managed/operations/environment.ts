import { Effect } from "../../Effect"
import { fromEffect } from "./fromEffect"

/**
 * Create a managed that accesses the environment.\
 *
 * @tsplus static ets/ManagedOps environment
 */
export function environment<R>(__tsplusTrace?: string) {
  return fromEffect(Effect.environment<R>())
}
