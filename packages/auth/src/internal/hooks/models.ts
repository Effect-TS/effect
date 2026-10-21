import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { SubjectId } from "../../Schema.ts"
import { LoginIdentifier } from "../identity/models.ts"

export const LifecycleAction = Schema.Literals([
  "registration",
  "sign-in",
  "session-creation",
  "credential-change",
  "factor-change",
  "identifier-change",
  "linking",
  "sign-out",
  "proof-request",
  "proof-verification",
  "proof-completion"
])

export type LifecycleAction = typeof LifecycleAction.Type

/** Deliberately excludes credentials, proofs, tokens, claims, and verification authority. */
export const LifecycleSnapshot = Schema.Struct({
  action: LifecycleAction,
  operation: Schema.NonEmptyString,
  subjectId: Schema.optionalKey(SubjectId),
  method: Schema.optionalKey(Schema.NonEmptyString),
  identifiers: Schema.Array(LoginIdentifier)
})

export type LifecycleSnapshot = typeof LifecycleSnapshot.Type

export const LifecycleEventId = Schema.NonEmptyString.pipe(
  Schema.brand("effect-auth/LifecycleEventId")
)

export type LifecycleEventId = typeof LifecycleEventId.Type

/** The owner supplies a stable, nonsecret identifier; delivery retries reuse this exact event. */
export const LifecycleEvent = Schema.Struct({
  id: LifecycleEventId,
  occurredAtMillis: Schema.Int.check(
    Schema.isBetween({ minimum: -8640000000000000, maximum: 8640000000000000 })
  ),
  snapshot: LifecycleSnapshot
})

export type LifecycleEvent = typeof LifecycleEvent.Type

export class HookDenied extends Schema.TaggedError<HookDenied>()("HookDenied", {
  reason: Schema.Literals(["policy", "unavailable"])
}) {}

export class HookDeliveryFailed extends Schema.TaggedError<HookDeliveryFailed>()(
  "HookDeliveryFailed",
  {}
) {}

export class HookConfigurationError extends Schema.TaggedError<HookConfigurationError>()(
  "HookConfigurationError",
  {
    reason: Schema.Literals([
      "duplicate-contribution",
      "duplicate-event",
      "duplicate-route",
      "incompatible-transaction",
      "closed-journal",
      "invalid-snapshot"
    ]),
    contribution: Schema.String
  }
) {}

export interface HookDelivery {
  readonly eventId: LifecycleEventId
  readonly contribution: string
  readonly status: "delivered" | "failed"
}

const snapshotCodec = Schema.toCodecIso(LifecycleSnapshot)
const encodeSnapshot = Schema.encodeSync(snapshotCodec)
const decodeSnapshot = Schema.decodeSync(snapshotCodec)
const eventCodec = Schema.toCodecIso(LifecycleEvent)
const encodeEvent = Schema.encodeSync(eventCodec)
const decodeEvent = Schema.decodeSync(eventCodec)

/** Projection also strips undeclared own properties of identifier Schema.Class instances. */
const captureSnapshot = (input: LifecycleSnapshot) =>
  Result.try({
    try: () => {
      const snapshot = decodeSnapshot(encodeSnapshot(input))

      return Object.freeze({
        ...snapshot,
        identifiers: Object.freeze(
          snapshot.identifiers.map((identifier) => Object.freeze(identifier))
        )
      })
    },
    catch: () => HookConfigurationError.make({ reason: "invalid-snapshot", contribution: "snapshot" })
  })

const captureEvent = (input: LifecycleEvent) =>
  Result.try({
    try: () => decodeEvent(encodeEvent(input)),
    catch: () => HookConfigurationError.make({ reason: "invalid-snapshot", contribution: "event" })
  }).pipe(
    Result.flatMap((event) =>
      captureSnapshot(event.snapshot).pipe(
        Result.map((snapshot) => Object.freeze({ ...event, snapshot })),
        Result.mapError(() => HookConfigurationError.make({ reason: "invalid-snapshot", contribution: "event" }))
      )
    )
  )

/** Synchronous projection for native persistence prepare callbacks. */
export const lifecycleSnapshot = (input: LifecycleSnapshot): LifecycleSnapshot => {
  const result = captureSnapshot(input)

  if (Result.isFailure(result)) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Native prepare callbacks must reject invalid snapshots before the transaction commits.
    throw result.failure
  }

  return result.success
}

/** Synchronous projection for native persistence prepare callbacks. */
export const lifecycleEvent = (input: LifecycleEvent): LifecycleEvent => {
  const result = captureEvent(input)

  if (Result.isFailure(result)) {
    // oxlint-disable-next-line effect/no-untyped-throw -- Native prepare callbacks must reject invalid events before the transaction commits.
    throw result.failure
  }

  return result.success
}

/**
 * Internal projection of library-built lifecycle data, after domain input validation.
 * Workflow callers retain the previous defect channel with orDie: malformed metadata
 * violates the producer contract, while an expected policy denial is HookDenied.
 * This does not replace configuration/input admission or native journal validation.
 *
 * @internal
 */
export const lifecycleSnapshotEffect = (input: LifecycleSnapshot) =>
  Effect.suspend(() => Effect.fromResult(captureSnapshot(input)))

/**
 * Same producer invariant as lifecycleSnapshotEffect. A malformed event remains a
 * defect even after commit; it must not enter ordinary failure recovery as though
 * the committed mutation had been rejected. Native prepare uses lifecycleEvent.
 *
 * @internal
 */
export const lifecycleEventEffect = (input: LifecycleEvent) =>
  Effect.suspend(() => Effect.fromResult(captureEvent(input)))
