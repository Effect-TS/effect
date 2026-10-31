import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import type { MalformedMessage, PersistenceError } from "../ClusterError.ts"

export const Current = Context.Reference<
  Array<Effect.Effect<void, PersistenceError | MalformedMessage>> | undefined
>("effect/cluster/MessageStorage/TransactionNotifications", { defaultValue: () => undefined })

const defer = <E>(
  notify: Effect.Effect<void, E>,
  deferred: Effect.Effect<void, PersistenceError | MalformedMessage>
): Effect.Effect<void, E> =>
  Current.use((notifications) =>
    notifications === undefined ? notify : Effect.sync(() => {
      notifications.push(deferred)
    })
  )

export const afterCommit = <E extends PersistenceError | MalformedMessage>(
  notify: Effect.Effect<void, E>
): Effect.Effect<void, E> => defer(notify, notify)

// Outside a transaction the caller still sees failures. A deferred wake-up
// runs after the commit, so its failure is dropped and the message is left
// for the next poll.
export const wakeAfterCommit = <E>(notify: Effect.Effect<void, E>): Effect.Effect<void, E> =>
  defer(notify, Effect.ignore(notify))
