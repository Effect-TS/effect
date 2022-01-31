import { Effect } from "../../Effect"
import type { Runtime } from "../../Runtime/definition"
import { Managed } from "../definition"

/**
 * Returns an `Managed` that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into Effect-TS code.
 *
 * @tsplus static ets/ManagedOps runtime
 */
export function runtime<R>(__etsTrace?: string): Managed<R, never, Runtime<R>> {
  return Managed.fromEffect(Effect.runtime<R>())
}
