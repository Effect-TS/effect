import * as Context from "effect/Context"
import * as Effect from "effect/Effect"

import { hookContribution } from "../hooks/lifecycleHooks.ts"
import { HookDeliveryFailed, type LifecycleEventId } from "../hooks/models.ts"
import type { LoginIdentifier } from "../identity/models.ts"

/** Optional explicit notification capability. Vendor failure never rolls back an
 * identifier change. Stable event IDs support consumer idempotency; direct hooks
 * are best effort, not a durable outbox or an exactly-once delivery guarantee.
 */
export class EmailIdentifierNotifier extends Context.Service<
  EmailIdentifierNotifier,
  {
    readonly notify: (input: {
      readonly eventId: LifecycleEventId
      readonly oldIdentifier: LoginIdentifier
      readonly newIdentifier: LoginIdentifier
      readonly occurredAtMillis: number
    }) => Effect.Effect<void, HookDeliveryFailed>
  }
>()("@effect/auth/EmailIdentifierNotifier") {}

export const emailIdentifierNotifications = <const Id extends string>(moduleId: Id) => {
  const contribution = hookContribution(`email/${moduleId}/old-address-notification`)

  const layer = contribution.layer({
    after: Effect.fn("EmailIdentifierNotifier.after")(function*(event) {
      if (
        event.snapshot.operation !== `${moduleId}/change-address` ||
        event.snapshot.action !== "identifier-change"
      ) {
        return
      }
      const [oldIdentifier, newIdentifier] = event.snapshot.identifiers

      if (!oldIdentifier || !newIdentifier) return yield* HookDeliveryFailed.make({})
      const notifier = yield* EmailIdentifierNotifier

      yield* notifier.notify({
        eventId: event.id,
        oldIdentifier,
        newIdentifier,
        occurredAtMillis: event.occurredAtMillis
      })
    })
  })

  return Object.freeze({ contribution, layer })
}
