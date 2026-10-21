import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { SubjectId } from "../../Schema.ts"
import { AuthenticationClock } from "./clock.ts"
import { AssuranceRequired, AuthenticationRequired, OperationForbidden } from "./errors.ts"

export const AuthenticationFactor = Schema.Literals(["knowledge", "possession", "inherence"])
export type AuthenticationFactor = typeof AuthenticationFactor.Type

export const AssuranceEvidence = Schema.Struct({
  method: Schema.NonEmptyString,
  /** Opaque within one session; multiple proofs of the same credential share it. */
  credentialOrdinal: Schema.optionalKey(
    Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 63 }))
  ),
  factors: Schema.Array(AuthenticationFactor),
  userVerified: Schema.Boolean,
  phishingResistant: Schema.Boolean,
  verifiedAt: Schema.DateTimeUtcFromMillis
})

/** Describes completed authentication, never a pending second-factor challenge. */
export class AuthenticationAssurance extends Schema.Class<AuthenticationAssurance>(
  "effect-auth/AuthenticationAssurance"
)({
  method: Schema.NonEmptyString,
  factors: Schema.Array(AuthenticationFactor),
  authenticatedAt: Schema.DateTimeUtcFromMillis,
  /** WebAuthn UV is separate from knowledge/inherence: the RP cannot tell PIN from biometrics. */
  evidence: Schema.optionalKey(Schema.NonEmptyArray(AssuranceEvidence))
}) {}

export interface GuestInvocation {
  readonly _tag: "Guest"
}

export interface AuthenticatedInvocation {
  readonly _tag: "Authenticated"
  readonly subjectId: SubjectId
  readonly sessionId?: string
  readonly assurance: AuthenticationAssurance
}

/** Application authority creates this context; clients cannot request it in a payload. */
export interface SystemInvocation {
  readonly _tag: "System"
  readonly authority: string
}

/** Passed explicitly per invocation. Never install a caller in a shared handler Layer. */
export type AuthInvocation = GuestInvocation | AuthenticatedInvocation | SystemInvocation

export const guest: GuestInvocation = Object.freeze({ _tag: "Guest" })

export const requireAuthenticated = (context: AuthInvocation) =>
  context._tag === "Authenticated"
    ? Effect.succeed(context)
    : Effect.fail(AuthenticationRequired.make({}))

export const requireOwnership = Effect.fnUntraced(function*(
  context: AuthInvocation,
  subjectId: SubjectId
) {
  const caller = yield* requireAuthenticated(context)

  if (caller.subjectId !== subjectId) {
    return yield* OperationForbidden.make({})
  }

  return caller
})

export interface AssuranceRequirement {
  readonly factors?: ReadonlyArray<AuthenticationFactor>
  readonly maximumAgeMillis: number
  readonly minimumCredentials?: number
  readonly userVerified?: true
  readonly phishingResistant?: true
}

/** Bound future lead with AuthenticationClock; accepted future evidence has age zero. */
export const requireAssurance = Effect.fnUntraced(function*(
  context: AuthInvocation,
  requirement: AssuranceRequirement
) {
  const caller = yield* requireAuthenticated(context)

  const maximumAge = yield* Schema.decodeEffect(
    Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))
  )(requirement.maximumAgeMillis).pipe(Effect.orDie)

  const minimum = yield* Schema.decodeEffect(
    Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 64 }))
  )(requirement.minimumCredentials ?? 1).pipe(Effect.orDie)

  const now = DateTime.toEpochMillis(yield* DateTime.now)
  const { futureToleranceMillis } = yield* AuthenticationClock

  if (
    DateTime.toEpochMillis(caller.assurance.authenticatedAt) - now > futureToleranceMillis ||
    caller.assurance.evidence?.some(
      (proof) => DateTime.toEpochMillis(proof.verifiedAt) - now > futureToleranceMillis
    )
  ) {
    return yield* AssuranceRequired.make({})
  }

  const fresh = caller.assurance.evidence?.filter(
    (proof) => Math.max(0, now - DateTime.toEpochMillis(proof.verifiedAt)) < maximumAge
  ) ?? []

  const factors = new Set(fresh.flatMap((proof) => proof.factors))

  const ordinals = new Set(
    fresh.flatMap((proof) => proof.credentialOrdinal === undefined ? [] : [proof.credentialOrdinal])
  )

  if (
    fresh.length === 0 ||
    (requirement.factors !== undefined &&
      !requirement.factors.every((factor) => factors.has(factor))) ||
    (minimum > 1 && ordinals.size < minimum) ||
    !fresh.some(
      (proof) =>
        (requirement.userVerified !== true || proof.userVerified) &&
        (requirement.phishingResistant !== true || proof.phishingResistant)
    )
  ) {
    return yield* AssuranceRequired.make({})
  }

  return caller
})
