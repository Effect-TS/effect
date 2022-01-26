import { Effect } from "../../Effect"
import { fromEffect } from "./fromEffect"

/**
 * Create a managed that accesses the environment.\
 *
 * @ets static ets/ManagedOps environment
 */
export function environment<R>(__etsTrace?: string) {
  return fromEffect(Effect.environment<R>())
}
