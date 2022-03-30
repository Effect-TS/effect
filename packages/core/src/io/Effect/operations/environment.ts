import { FiberRef } from "../../FiberRef"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Accesses the whole environment of the effect.
 *
 * @tsplus static ets/EffectOps environment
 */
export function environment<R>(__tsplusTrace?: string): RIO<R, R> {
  return Effect.suspendSucceed(FiberRef.currentEnvironment.value.get())
}
