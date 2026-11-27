import * as Context from "../../Context.ts"
import type * as Effect from "../../Effect.ts"
import type { MalformedMessage, PersistenceError } from "../ClusterError.ts"

export interface TransactionState {
  readonly root: object
  readonly commits: Array<() => void>
  readonly rollbacks: Array<() => void>
  readonly notifications: Array<Effect.Effect<void, PersistenceError | MalformedMessage>>
}

export const TransactionNotifications = Context.Reference<TransactionState | undefined>(
  "effect/cluster/MessageStorage/TransactionNotifications",
  { defaultValue: () => undefined }
)
