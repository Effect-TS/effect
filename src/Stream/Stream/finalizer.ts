import type { SyncR as EffSyncR } from "../../Effect"
import { unit } from "../../Effect"
import { bracket } from "./bracket"
import type { SyncR } from "./definitions"

/**
 * Creates a one-element stream that never fails and executes the finalizer when it ends.
 */
export function finalizer<R>(finalizer: EffSyncR<R, unknown>): SyncR<R, unknown> {
  return bracket((_) => finalizer)(unit)
}
