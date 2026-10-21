import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import { LoginIdentifier } from "../identity/models.ts"
import { AuthenticationRevision, CredentialRevision } from "../sessions/models.ts"

const BoundedId = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(256))

export const ProofId = BoundedId.pipe(Schema.brand("effect-auth/ProofId"))
export type ProofId = typeof ProofId.Type
export const ProofRequestId = BoundedId.pipe(Schema.brand("effect-auth/ProofRequestId"))
export type ProofRequestId = typeof ProofRequestId.Type
export const ProofDeliveryId = BoundedId.pipe(Schema.brand("effect-auth/ProofDeliveryId"))
export type ProofDeliveryId = typeof ProofDeliveryId.Type
export const ProofPurpose = BoundedId.pipe(Schema.brand("effect-auth/ProofPurpose"))
export type ProofPurpose = typeof ProofPurpose.Type

export const ProofInstant = Schema.Int.check(
  Schema.isBetween({ minimum: -8640000000000000, maximum: 8640000000000000 })
)

const BoundedIdentifier = Schema.Struct({
  namespace: LoginIdentifier.fields.namespace.check(Schema.isMaxLength(256)),
  value: LoginIdentifier.fields.value.check(Schema.isMaxLength(2048))
}).pipe(Schema.decodeTo(LoginIdentifier))

const BoundedRevision = Schema.Struct({
  ...AuthenticationRevision.fields,
  subjectId: AuthenticationRevision.fields.subjectId.check(Schema.isMaxLength(256)),
  securityRevision: AuthenticationRevision.fields.securityRevision.check(Schema.isMaxLength(256)),
  credentials: Schema.Array(
    Schema.Struct({
      credentialId: CredentialRevision.fields.credentialId.check(Schema.isMaxLength(256)),
      revision: CredentialRevision.fields.revision.check(Schema.isMaxLength(256))
    })
  ).check(Schema.isMaxLength(32))
})

const FlowBinding = {
  flowId: BoundedId,
  contextDigest: TokenDigest.check(Schema.isMaxLength(256))
}

export const IdentifierProofBinding = Schema.TaggedStruct("Identifier", {
  ...FlowBinding,
  identifier: BoundedIdentifier
})

export const SubjectProofBinding = Schema.TaggedStruct("Subject", {
  ...FlowBinding,
  revision: BoundedRevision,
  identifier: BoundedIdentifier
})

export const IdentifierChangeProofBinding = Schema.TaggedStruct("IdentifierChange", {
  ...FlowBinding,
  revision: BoundedRevision,
  identifier: BoundedIdentifier
})

export const ProofBinding = Schema.Union([
  IdentifierProofBinding,
  SubjectProofBinding,
  IdentifierChangeProofBinding
])

export type ProofBinding = typeof ProofBinding.Type

/** Same public shape for issued, ineligible, and throttled requests. Request IDs are correlation only. */
export const ProofReference = Schema.Struct({
  proofId: ProofId,
  purpose: ProofPurpose,
  keyId: BoundedId
})

export type ProofReference = typeof ProofReference.Type

export const ProofRequestReceipt = Schema.Struct({
  requestId: ProofRequestId,
  reference: ProofReference
})

export type ProofRequestReceipt = typeof ProofRequestReceipt.Type

export const ProofDigest = Schema.Struct({ keyId: BoundedId, digest: TokenDigest })
export type ProofDigest = typeof ProofDigest.Type

/** Issue timestamps come from the persistence owner's authoritative clock. */
export const ProofIssueRecord = Schema.Struct({
  moduleId: BoundedId,
  purpose: ProofPurpose,
  proofId: ProofId,
  binding: ProofBinding,
  verifier: ProofDigest
})

export type ProofIssueRecord = typeof ProofIssueRecord.Type

export const ProofRecord = Schema.Struct({
  ...ProofIssueRecord.fields,
  issuedAtMillis: ProofInstant,
  expiresAtMillis: ProofInstant
})

export type ProofRecord = typeof ProofRecord.Type

export const ProofIssueDecision = Schema.Union([
  Schema.TaggedStruct("Issued", { record: ProofRecord }),
  Schema.TaggedStruct("Suppressed", {})
])

export type ProofIssueDecision = typeof ProofIssueDecision.Type

export const ProofRedemptionInput = Schema.Struct({
  moduleId: BoundedId,
  purpose: ProofPurpose,
  proofId: ProofId,
  binding: ProofBinding,
  candidate: Schema.optionalKey(ProofDigest),
  maximumFailedAttempts: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 }))
})

export type ProofRedemptionInput = typeof ProofRedemptionInput.Type
export const ProofRedemptionDecision = Schema.Literals(["redeemed", "rejected"])
export type ProofRedemptionDecision = typeof ProofRedemptionDecision.Type

export const ProofDeliveryOutcome = Schema.Union([
  Schema.TaggedStruct("Accepted", {}),
  Schema.TaggedStruct("DefiniteFailure", {
    reason: Schema.Literals(["recipient", "policy", "unavailable"])
  }),
  Schema.TaggedStruct("Ambiguous", {})
])

export type ProofDeliveryOutcome = typeof ProofDeliveryOutcome.Type
