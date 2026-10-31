import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import type { MalformedMessage, PersistenceError } from "../ClusterError.ts"

export const Current = Context.Reference<
  Array<Effect.Effect<void, PersistenceError | MalformedMessage>> | undefined
>("effect/cluster/MessageStorage/TransactionNotifications", { defaultValue: () => undefined })

export const afterCommit = <E extends PersistenceError | MalformedMessage>(
  notify: Effect.Effect<void, E>
): Effect.Effect<void, E> =>
  Current.use((notifications) =>
    notifications === undefined ? notify : Effect.sync(() => {
      notifications.push(notify)
    })
  )
