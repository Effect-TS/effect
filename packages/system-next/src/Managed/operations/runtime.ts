// ets_tracing: off

import type { Runtime } from "../../Runtime/definition"
import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { fromEffect } from "./fromEffect"

/**
 * Returns an `Managed` that accesses the runtime, which can be used to
 * (unsafely) execute tasks. This is useful for integration with legacy code
 * that must call back into Effect-TS code.
 */
export function runtime<R>(__trace?: string): Managed<R, never, Runtime<R>> {
  return fromEffect(T.runtime<R>(), __trace)
}
