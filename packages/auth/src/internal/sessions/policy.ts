import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import { AuthenticationClock } from "../operations/clock.ts"
import { reportAuthDiagnostic } from "../shared/diagnostics.ts"
import { SessionConfigurationError, SessionInvalid } from "./errors.ts"
import type { SessionCapabilities, SessionMetadata } from "./models.ts"

const PositiveMillis = Schema.Int.check(Schema.isGreaterThan(0))

/** @internal */
export const maximumCacheMillis = 300_000

export const SessionPolicy = Schema.Struct({
  issuer: Schema.NonEmptyString,
  audience: Schema.NonEmptyString,
  generation: Schema.Natural,
  idleLifetimeMillis: PositiveMillis,
  absoluteLifetimeMillis: PositiveMillis,
  renewalIntervalMillis: PositiveMillis,
  /** Deployment-wide upper bound including tokens issued under older policy versions. */
  maximumIssuedAbsoluteLifetimeMillis: PositiveMillis,
  maximumTokenBytes: Schema.Int.check(Schema.isBetween({ minimum: 256, maximum: 1048576 })),
  /** Opt-in cookie cache. Revocation and claim changes may lag by this duration. */
  positiveCacheMillis: Schema.optionalKey(Schema.Natural),
  requireImmediateInvalidation: Schema.Boolean
})

export type SessionPolicy = typeof SessionPolicy.Type

export const validateSessionPolicy = Effect.fnUntraced(function*(
  input: SessionPolicy,
  capabilities: SessionCapabilities
) {
  const policy = yield* Schema.decodeEffect(SessionPolicy)(input).pipe(
    Effect.mapError(() => SessionConfigurationError.make({ reason: "policy" }))
  )

  if (
    policy.renewalIntervalMillis >= policy.idleLifetimeMillis ||
    policy.idleLifetimeMillis > policy.absoluteLifetimeMillis ||
    policy.absoluteLifetimeMillis > policy.maximumIssuedAbsoluteLifetimeMillis ||
    (policy.positiveCacheMillis ?? 0) > Math.min(policy.renewalIntervalMillis, maximumCacheMillis)
  ) {
    return yield* SessionConfigurationError.make({ reason: "policy" })
  }
  if (capabilities.mode !== "stateful" && (policy.positiveCacheMillis ?? 0) > 0) {
    return yield* SessionConfigurationError.make({ reason: "capability" })
  }
  if (
    policy.requireImmediateInvalidation &&
    (capabilities.subjectInvalidation !== "immediate" || (policy.positiveCacheMillis ?? 0) > 0)
  ) {
    return yield* SessionConfigurationError.make({ reason: "capability" })
  }

  return Object.freeze(policy)
})

export const validateSessionTimeline = Effect.fnUntraced(function*(
  session: Pick<SessionMetadata, "assurance" | "issuedAt" | "expiresAt" | "absoluteExpiresAt">,
  policy: SessionPolicy
) {
  const now = DateTime.toEpochMillis(yield* DateTime.now)
  const { futureToleranceMillis } = yield* AuthenticationClock
  const authenticatedAt = DateTime.toEpochMillis(session.assurance.authenticatedAt)
  const issuedAt = DateTime.toEpochMillis(session.issuedAt)
  const expiresAt = DateTime.toEpochMillis(session.expiresAt)
  const absoluteExpiresAt = DateTime.toEpochMillis(session.absoluteExpiresAt)
  const evidence = session.assurance.evidence

  if (
    evidence === undefined ||
    !evidence.some((proof) => DateTime.toEpochMillis(proof.verifiedAt) === authenticatedAt) ||
    evidence.some((proof) => {
      const verifiedAt = DateTime.toEpochMillis(proof.verifiedAt)

      return verifiedAt > issuedAt
    })
  ) {
    yield* reportAuthDiagnostic("session-timeline", "invalid-evidence")

    return yield* SessionInvalid.make({})
  }
  if (authenticatedAt > issuedAt || expiresAt > absoluteExpiresAt || expiresAt <= issuedAt) {
    yield* reportAuthDiagnostic("session-timeline", "chronology")

    return yield* SessionInvalid.make({})
  }
  if (issuedAt - now > futureToleranceMillis) {
    yield* reportAuthDiagnostic("session-timeline", "future-issued")

    return yield* SessionInvalid.make({})
  }
  if (now >= expiresAt) {
    yield* reportAuthDiagnostic("session-timeline", "expired")

    return yield* SessionInvalid.make({})
  }
  if (absoluteExpiresAt - authenticatedAt > policy.maximumIssuedAbsoluteLifetimeMillis) {
    yield* reportAuthDiagnostic("session-timeline", "lifetime")

    return yield* SessionInvalid.make({})
  }

  return session
})

export const statefulCapabilities: SessionCapabilities = Object.freeze({
  mode: "stateful",
  listing: true,
  perSessionRevocation: true,
  subjectInvalidation: "immediate",
  renewal: "single-winner",
  positiveCacheMillis: 0
})

export const statelessCapabilities: SessionCapabilities = Object.freeze({
  mode: "stateless",
  listing: false,
  perSessionRevocation: false,
  subjectInvalidation: "absolute-expiry",
  renewal: "replayable",
  positiveCacheMillis: 0
})

export const stateAssistedCapabilities: SessionCapabilities = Object.freeze({
  mode: "state-assisted",
  listing: false,
  perSessionRevocation: true,
  subjectInvalidation: "immediate",
  renewal: "replayable",
  positiveCacheMillis: 0
})
