// ets_tracing: off

import * as FiberRef from "../../FiberRef"
import type { RIO } from "../definition"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Accesses the whole environment of the effect.
 */
export function environment<R>(__trace?: string): RIO<R, R> {
  return suspendSucceed(() => FiberRef.get(FiberRef.currentEnvironment.value), __trace)
}
