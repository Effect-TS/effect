import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import { identity } from "../../Function.ts"

// Notifications held back by the transaction in progress, run after the
// outermost commit and dropped on rollback.
const Current = Context.Reference<Array<Effect.Effect<void>> | undefined>(
  "effect/cluster/MessageStorage/TransactionNotifications",
  { defaultValue: () => undefined }
)

// Wraps `run` (the driver's transaction) so notifications queued inside
// `effect` are held until the outermost commit. Nested transactions hand
// their notifications to the enclosing one.
export const withTransaction = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  run: (effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  Current.use((outer) => {
    const notifications: Array<Effect.Effect<void>> = []
    return Effect.tap(
      run(Effect.provideService(effect, Current, notifications)),
      () =>
        outer
          ? Effect.sync(() => {
            outer.push(...notifications)
          })
          : Effect.forEach(notifications, identity, { discard: true })
    )
  })

const defer = <E>(notify: Effect.Effect<void, E>, deferred: Effect.Effect<void>): Effect.Effect<void, E> =>
  Current.use((notifications) =>
    notifications === undefined ? notify : Effect.sync(() => {
      notifications.push(deferred)
    })
  )

// Runs `notify` now, or after the outermost commit inside a transaction. A
// failure after the commit can no longer be returned, so it becomes a defect.
export const afterCommit = <E>(notify: Effect.Effect<void, E>): Effect.Effect<void, E> =>
  defer(notify, Effect.orDie(notify))

// Like `afterCommit`, but a failure after the commit is dropped: the message
// is already persisted, and the next storage poll delivers it.
export const wakeAfterCommit = <E>(notify: Effect.Effect<void, E>): Effect.Effect<void, E> =>
  defer(notify, Effect.ignore(notify))
