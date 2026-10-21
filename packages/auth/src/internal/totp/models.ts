import * as Schema from "effect/Schema"

import { SubjectId, TokenDigest } from "../../Schema.ts"
import { SessionInvalidationWindow } from "../sessions/invalidation.ts"
import {
  AuthenticationEvidence,
  AuthenticationFlowId,
  AuthenticationRequirement,
  AuthenticationRevision
} from "../sessions/models.ts"
import { PendingAuthenticationContext } from "../sessions/pendingAuthentication.ts"

/** @internal */
export const TotpId = Schema.NonEmptyString.check(Schema.isMaxLength(256))

/** @internal */
export const TotpInstant = Schema.Natural.check(
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
)

/** @internal */
export const TotpCode = Schema.RedactedFromValue(
  Schema.String.check(Schema.isPattern(/^[0-9]{6}$/))
)

/** @internal */
export const TotpRecoveryCode = Schema.RedactedFromValue(
  Schema.String.check(Schema.isPattern(/^rc1-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/))
)

/** @internal */
export const TotpCredential = Schema.RedactedFromValue(
  Schema.NonEmptyString.check(Schema.isMaxLength(16384))
)

export const TotpSecretEnvelope = Schema.Struct({
  keyId: TotpId,
  nonce: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{16}$/)),
  ciphertext: Schema.String.check(Schema.isMaxLength(256)),
  revision: TotpId
})

export type TotpSecretEnvelope = typeof TotpSecretEnvelope.Type

export const TotpSecretBinding = Schema.Struct({
  moduleId: TotpId,
  subjectId: SubjectId,
  credentialId: TotpId,
  revision: TotpId
})

export type TotpSecretBinding = typeof TotpSecretBinding.Type

/** @internal */
export const TotpPendingEnrollment = Schema.Struct({
  revision: TotpId,
  enrollmentId: TotpId,
  secret: TotpSecretEnvelope,
  expiresAtMillis: TotpInstant,
  failedAttempts: Schema.Natural
})

export const TotpRecord = Schema.Struct({
  moduleId: TotpId,
  subjectId: SubjectId,
  credentialId: TotpId,
  revision: TotpId,
  version: TotpId,
  secret: Schema.NullOr(TotpSecretEnvelope),
  pending: Schema.NullOr(TotpPendingEnrollment),
  recoveryDigests: Schema.Array(TokenDigest).check(Schema.isMaxLength(10)),
  acceptedStep: Schema.Int.check(Schema.isGreaterThanOrEqualTo(-1)),
  attemptWindow: TotpInstant,
  failedAttempts: Schema.Natural
})

export type TotpRecord = typeof TotpRecord.Type

export const TotpSnapshot = Schema.Struct({
  revision: AuthenticationRevision,
  requirement: AuthenticationRequirement,
  record: Schema.NullOr(TotpRecord)
})

export type TotpSnapshot = typeof TotpSnapshot.Type
/** @internal */
export const TotpAction = Schema.Literals(["enroll", "confirm", "disable", "regenerate"])

export const TotpActionChallenge = Schema.Struct({
  moduleId: TotpId,
  action: TotpAction,
  commandId: TotpId,
  flowId: AuthenticationFlowId,
  bindingDigest: TokenDigest,
  revision: AuthenticationRevision
})

export type TotpActionChallenge = typeof TotpActionChallenge.Type

export const TotpActionAuthorization = Schema.Struct({
  challenge: TotpActionChallenge,
  evidence: AuthenticationEvidence,
  requirement: AuthenticationRequirement
})

export type TotpActionAuthorization = typeof TotpActionAuthorization.Type

export const TotpPolicy = Schema.Struct({
  issuer: Schema.NonEmptyString.check(Schema.isMaxLength(128)),
  enrollmentLifetimeMillis: Schema.Int.check(Schema.isBetween({ minimum: 30000, maximum: 600000 })),
  revealLifetimeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 300000 })),
  clockSkewSteps: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 1 })),
  attemptLimit: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10 })),
  attemptWindowMillis: Schema.Int.check(Schema.isBetween({ minimum: 30000, maximum: 3600000 })),
  maximumEvidenceAgeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 300000 })),
  allowRecoveryCodeForPending: Schema.Boolean,
  lostFactorRecovery: Schema.Literals(["deny", "reset-with-recovery-code"]),
  requireImmediateInvalidation: Schema.Boolean
})

export type TotpPolicy = typeof TotpPolicy.Type

export const TotpManagementResult = Schema.Struct({
  enabled: Schema.Boolean,
  invalidation: SessionInvalidationWindow
})

/** Recovery-code rotation keeps existing sessions and assurance revisions valid. */
export const TotpRecoveryRegenerated = Schema.Struct({
  enabled: Schema.Literal(true)
})

export const TotpEnrollmentStarted = Schema.Struct({
  enrollmentId: TotpId,
  expiresAtMillis: TotpInstant
})

export const TotpRecoveryReset = Schema.Struct({
  outcome: Schema.Literal("reauthentication-required"),
  invalidation: SessionInvalidationWindow
})

export const TotpDecision = Schema.Union([
  Schema.TaggedStruct("Accepted", { record: TotpRecord }),
  Schema.TaggedStruct("Rejected", {})
])

export type TotpDecision = typeof TotpDecision.Type

export const TotpMutation = Schema.Struct({
  snapshot: TotpSnapshot,
  moduleId: TotpId,
  subjectId: SubjectId,
  policy: TotpPolicy,
  authorization: Schema.optionalKey(TotpActionAuthorization),
  action: Schema.Union([
    Schema.TaggedStruct("Enroll", { record: TotpRecord }),
    Schema.TaggedStruct("Confirm", {
      enrollmentId: TotpId,
      matchedStep: Schema.NullOr(Schema.Natural),
      recoveryDigests: Schema.Array(TokenDigest).check(Schema.isBetweenLength(10, 10))
    }),
    Schema.TaggedStruct("Verify", { matchedStep: Schema.NullOr(Schema.Natural) }),
    Schema.TaggedStruct("Recovery", {
      digest: TokenDigest,
      reset: Schema.Boolean,
      pending: Schema.optionalKey(PendingAuthenticationContext)
    }),
    Schema.TaggedStruct("Disable", {}),
    Schema.TaggedStruct("Regenerate", {
      recoveryDigests: Schema.Array(TokenDigest).check(Schema.isBetweenLength(10, 10))
    })
  ])
})

export type TotpMutation = typeof TotpMutation.Type
