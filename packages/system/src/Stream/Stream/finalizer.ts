// ets_tracing: off

import * as T from "../_internal/effect.js"
import { bracket_ } from "./bracket.js"
import type { RIO } from "./definitions.js"

/**
 * Creates a one-element stream that never fails and executes the finalizer when it ends.
 */
export function finalizer<R>(finalizer: T.RIO<R, unknown>): RIO<R, unknown> {
  return bracket_(T.unit, (_) => finalizer)
}
