import type { SyncR as EffSyncR } from "../../Effect"
import { unit } from "../../Effect"
import { bracket } from "./bracket"
import type { SyncR } from "./definitions"

export function finalizer<R>(finalizer: EffSyncR<R, unknown>): SyncR<R, unknown> {
  return bracket((_) => finalizer)(unit)
}
