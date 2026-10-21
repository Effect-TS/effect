import * as Schema from "effect/Schema"

import { RequestBindingCredential, RequestBindingFlowId } from "../operations/requestBinding.ts"
import { ProofReference } from "../proofs/models.ts"
import { AuthenticationRequirement, AuthenticationRevision, SecurityRevision } from "../sessions/models.ts"

/** Canonical international input. Country eligibility belongs to the application. */
export const PhoneNumber = Schema.String.check(Schema.isPattern(/^\+[1-9][0-9]{1,14}$/))
export type PhoneNumber = typeof PhoneNumber.Type

export const PhoneOtpComplete = Schema.Struct({
  flowId: RequestBindingFlowId,
  phoneNumber: PhoneNumber,
  requestBinding: RequestBindingCredential,
  reference: ProofReference,
  code: Schema.RedactedFromValue(Schema.String.check(Schema.isMaxLength(4096)))
})

export type PhoneOtpComplete = typeof PhoneOtpComplete.Type

export const PhoneCredentialSnapshot = Schema.Struct({
  /** Current policy from the same authoritative read as the revision vector. */
  requirement: AuthenticationRequirement,
  moduleId: Schema.NonEmptyString.check(Schema.isMaxLength(128)),
  phoneNumber: PhoneNumber,
  custodyRevision: SecurityRevision,
  verifiedAtMillis: Schema.Int,
  credentialId: Schema.NonEmptyString.check(Schema.isMaxLength(256)),
  credentialRevision: SecurityRevision,
  revision: AuthenticationRevision
})

export type PhoneCredentialSnapshot = typeof PhoneCredentialSnapshot.Type

export class PhoneOtpRejected extends Schema.TaggedError<PhoneOtpRejected>()(
  "PhoneOtpRejected",
  {}
) {}

export class PhoneOtpUnavailable extends Schema.TaggedError<PhoneOtpUnavailable>()(
  "PhoneOtpUnavailable",
  {}
) {}
