import type { RIO as EffRIO } from "../../Effect"
import { unit } from "../../Effect"
import { bracket_ } from "./bracket"
import type { RIO } from "./definitions"

/**
 * Creates a one-element stream that never fails and executes the finalizer when it ends.
 */
export function finalizer<R>(finalizer: EffRIO<R, unknown>): RIO<R, unknown> {
  return bracket_(unit, (_) => finalizer)
}
