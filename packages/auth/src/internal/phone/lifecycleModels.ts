import * as Schema from "effect/Schema"

import { SubjectId, TokenDigest } from "../../Schema.ts"
import { HookDenied } from "../hooks/models.ts"
import {
  AuthenticationEvidence,
  AuthenticationFlowId,
  AuthenticationRequirement,
  AuthenticationRevision,
  SecurityRevision
} from "../sessions/models.ts"
import { PhoneCredentialSnapshot, PhoneNumber, PhoneOtpRejected, PhoneOtpUnavailable } from "./models.ts"
export const PhoneCommandId = Schema.NonEmptyString.check(Schema.isMaxLength(256))
export const PhoneLifecycleAction = Schema.Literals(["register", "verify", "change"])
export type PhoneLifecycleAction = typeof PhoneLifecycleAction.Type

export const PhoneLifecyclePolicy = Schema.Struct({
  maximumEvidenceAgeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 300000 })),
  requireImmediateInvalidation: Schema.Boolean
})

export type PhoneLifecyclePolicy = typeof PhoneLifecyclePolicy.Type

export const PhoneAdmissionPolicy = Schema.Struct({
  windowMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 86400000 })),
  networkRequests: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 10000 })),
  networkAttempts: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100000 })),
  maximumMessages: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 1000000 }))
})

export type PhoneAdmissionPolicy = typeof PhoneAdmissionPolicy.Type

export const PhoneCustody = Schema.Struct({
  phoneNumber: PhoneNumber,
  custodyRevision: SecurityRevision,
  credentialRevision: SecurityRevision,
  verifiedAtMillis: Schema.NullOr(Schema.Int),
  subjectId: SubjectId,
  credentialId: Schema.NonEmptyString,
  state: Schema.Literals(["unverified", "verified", "retired"])
})

export type PhoneCustody = typeof PhoneCustody.Type

export const PhoneLifecycleTarget = Schema.Struct({
  phoneNumber: PhoneNumber,
  custody: Schema.NullOr(PhoneCustody),
  revision: Schema.NullOr(AuthenticationRevision),
  source: Schema.NullOr(PhoneCustody),
  eligible: Schema.Boolean
})

export type PhoneLifecycleTarget = typeof PhoneLifecycleTarget.Type

export const PhoneActionChallenge = Schema.Struct({
  moduleId: Schema.NonEmptyString,
  action: Schema.Literals(["verify", "change"]),
  commandId: PhoneCommandId,
  flowId: AuthenticationFlowId,
  phoneNumber: PhoneNumber,
  sourcePhoneNumber: Schema.optionalKey(PhoneNumber),
  revision: AuthenticationRevision,
  bindingDigest: TokenDigest
})

export type PhoneActionChallenge = typeof PhoneActionChallenge.Type

export const PhoneActionAuthorization = Schema.Struct({
  challenge: PhoneActionChallenge,
  evidence: AuthenticationEvidence,
  requirement: AuthenticationRequirement,
  actionRequirement: AuthenticationRequirement
})

export type PhoneActionAuthorization = typeof PhoneActionAuthorization.Type

export class PhoneActionRequired extends Schema.TaggedError<PhoneActionRequired>()(
  "PhoneActionRequired",
  {}
) {}

export class PhoneConfigurationError extends Schema.TaggedError<PhoneConfigurationError>()(
  "PhoneConfigurationError",
  {}
) {}

export const PhoneLifecycleFailure = Schema.Union([
  PhoneOtpRejected,
  PhoneOtpUnavailable,
  PhoneActionRequired,
  PhoneConfigurationError,
  HookDenied
])

export const PhoneMutationDecision = Schema.Union([
  Schema.TaggedStruct("Accepted", { credential: PhoneCredentialSnapshot }),
  Schema.TaggedStruct("Rejected", {})
])

export type PhoneMutationDecision = typeof PhoneMutationDecision.Type
