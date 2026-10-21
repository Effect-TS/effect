import * as Base64Url from "effect/encoding/Base64Url"
import * as Schema from "effect/Schema"

import { SubjectId, TokenDigest } from "../../Schema.ts"
import { RequestBindingCredential, RequestBindingFlowId } from "../operations/requestBindingModels.ts"
import { SessionInvalidationWindow } from "../sessions/invalidation.ts"
import {
  AssuranceAlternative,
  AuthenticationEvidence,
  AuthenticationFlowId,
  AuthenticationProof,
  AuthenticationRequirement,
  AuthenticationRevision,
  CredentialRevision
} from "../sessions/models.ts"

export const PasskeyLabel = Schema.NonEmptyString.check(Schema.isMaxLength(128))
export const PasskeyModuleId = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._:/-]{1,128}$/))
export const PasskeyCommandId = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._:/-]{1,256}$/))
export const PasskeyProfileId = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._-]{1,128}$/))

export const PasskeyInstant = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: 8640000000000000 })
)

export const PasskeyCounter = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: 0xffffffff })
)

const bytes = (minimum: number, maximum: number) =>
  Schema.String.check(
    Schema.isMaxLength(Math.ceil((maximum * 4) / 3)),
    Schema.makeFilter((value) => {
      const result = Base64Url.decode(value)

      return (
        result._tag === "Success" &&
        result.success.length >= minimum &&
        result.success.length <= maximum &&
        Base64Url.encode(result.success) === value
      )
    })
  )

export const PasskeyProtocolCredentialId = bytes(1, 1023).pipe(
  Schema.brand("effect-auth/PasskeyProtocolCredentialId")
)

export type PasskeyProtocolCredentialId = typeof PasskeyProtocolCredentialId.Type
export const PasskeyUserHandle = bytes(1, 64).pipe(Schema.brand("effect-auth/PasskeyUserHandle"))
export type PasskeyUserHandle = typeof PasskeyUserHandle.Type
export const PasskeyChallenge = bytes(32, 64)
export const PasskeyPublicKey = bytes(1, 8192)
export const PasskeyCredentialId = Schema.NonEmptyString.check(Schema.isMaxLength(256))

export const PasskeyRpId = Schema.String.check(
  Schema.isPattern(
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
  ),
  Schema.isMaxLength(253)
)

export const PasskeyProfile = Schema.Struct({
  profileId: PasskeyProfileId,
  rpId: PasskeyRpId,
  rpName: PasskeyLabel,
  origins: Schema.NonEmptyArray(Schema.NonEmptyString.check(Schema.isMaxLength(2048))).check(
    Schema.isMaxLength(16)
  ),
  developmentLocalhost: Schema.Boolean,
  residentKey: Schema.Literals(["required", "preferred", "discouraged"]),
  userVerification: Schema.Literals(["required", "preferred"]),
  primarySignIn: Schema.Boolean,
  attestation: Schema.Literal("none"),
  algorithms: Schema.NonEmptyArray(Schema.Literals([-7, -257])).check(Schema.isMaxLength(2))
})

export type PasskeyProfile = typeof PasskeyProfile.Type

export const PasskeyDescriptor = Schema.Struct({
  type: Schema.Literal("public-key"),
  id: PasskeyProtocolCredentialId
})

export const PasskeyAuthenticationOptions = Schema.Struct({
  challenge: PasskeyChallenge,
  rpId: PasskeyRpId,
  timeout: Schema.Int,
  userVerification: PasskeyProfile.fields.userVerification,
  allowCredentials: Schema.Array(PasskeyDescriptor).check(Schema.isMaxLength(64))
})

export type PasskeyAuthenticationOptions = typeof PasskeyAuthenticationOptions.Type

export const PasskeyRegistrationOptions = Schema.Struct({
  challenge: PasskeyChallenge,
  rp: Schema.Struct({ id: PasskeyRpId, name: PasskeyLabel }),
  user: Schema.Struct({ id: PasskeyUserHandle, name: PasskeyLabel, displayName: PasskeyLabel }),
  pubKeyCredParams: Schema.NonEmptyArray(
    Schema.Struct({ type: Schema.Literal("public-key"), alg: Schema.Literals([-7, -257]) })
  ).check(Schema.isMaxLength(2)),
  timeout: Schema.Int,
  attestation: Schema.Literal("none"),
  authenticatorSelection: Schema.Struct({
    residentKey: PasskeyProfile.fields.residentKey,
    userVerification: PasskeyProfile.fields.userVerification
  }),
  excludeCredentials: Schema.Array(PasskeyDescriptor).check(Schema.isMaxLength(64))
})

export type PasskeyRegistrationOptions = typeof PasskeyRegistrationOptions.Type

export const PasskeyRevision = Schema.Struct({
  ...AuthenticationRevision.fields,
  subjectId: SubjectId.check(Schema.isMaxLength(256)),
  securityRevision: AuthenticationRevision.fields.securityRevision.check(Schema.isMaxLength(256)),
  credentials: Schema.Array(
    Schema.Struct({
      ...CredentialRevision.fields,
      credentialId: PasskeyCredentialId,
      revision: CredentialRevision.fields.revision.check(Schema.isMaxLength(256))
    })
  ).check(Schema.isMaxLength(64))
})

export const PasskeyRequirement = Schema.Struct({
  ...AuthenticationRequirement.fields,
  alternatives: Schema.NonEmptyArray(
    Schema.Struct({
      ...AssuranceAlternative.fields,
      factors: AssuranceAlternative.fields.factors.check(Schema.isMaxLength(3)),
      minimumCredentials: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 64 }))
    })
  ).check(Schema.isMaxLength(16))
})

export const PasskeyEvidence = Schema.Struct({
  ...AuthenticationEvidence.fields,
  revision: PasskeyRevision,
  flowId: AuthenticationFlowId.check(Schema.isMaxLength(256)),
  proofs: Schema.NonEmptyArray(
    Schema.Struct({
      ...AuthenticationProof.fields,
      method: PasskeyLabel,
      credentialId: PasskeyCredentialId,
      factors: AuthenticationProof.fields.factors.check(Schema.isMaxLength(3))
    })
  ).check(Schema.isMaxLength(64))
})

export const PasskeyCredential = Schema.Struct({
  /** Current policy from the same authoritative read as the revision vector. */
  requirement: AuthenticationRequirement,
  credentialId: PasskeyCredentialId,
  rpId: PasskeyRpId,
  protocolCredentialId: PasskeyProtocolCredentialId,
  userHandle: PasskeyUserHandle,
  publicKey: PasskeyPublicKey,
  algorithm: Schema.Literals([-7, -257]),
  profile: PasskeyProfile,
  revision: PasskeyRevision,
  active: Schema.Boolean,
  primarySignIn: Schema.Boolean,
  enrollmentUserVerified: Schema.Boolean,
  backupEligible: Schema.Boolean,
  backupState: Schema.Boolean,
  counter: PasskeyCounter
})

export type PasskeyCredential = typeof PasskeyCredential.Type

export const PasskeyCredentialSummary = Schema.Struct({
  credentialId: PasskeyCredentialId,
  name: PasskeyLabel,
  primarySignIn: Schema.Boolean,
  createdAtMillis: PasskeyInstant,
  lastUsedAtMillis: Schema.optionalKey(PasskeyInstant)
})

export type PasskeyCredentialSummary = typeof PasskeyCredentialSummary.Type

export const PasskeyTarget = Schema.Struct({
  moduleId: PasskeyModuleId,
  kind: PasskeyLabel,
  commandId: PasskeyCommandId,
  flowId: AuthenticationFlowId.check(Schema.isMaxLength(256)),
  bindingDigest: TokenDigest.check(Schema.isMaxLength(256)),
  revision: PasskeyRevision,
  requirement: Schema.optionalKey(PasskeyRequirement),
  expiresAtMillis: PasskeyInstant
})

export type PasskeyTarget = typeof PasskeyTarget.Type

export const PasskeyEnrollmentSnapshot = Schema.Struct({
  revision: PasskeyRevision,
  userHandle: Schema.optionalKey(PasskeyUserHandle),
  credentials: Schema.Array(PasskeyDescriptor).check(Schema.isMaxLength(64))
})

export type PasskeyEnrollmentSnapshot = typeof PasskeyEnrollmentSnapshot.Type

export const PasskeyActionChallenge = Schema.Struct({
  moduleId: PasskeyModuleId,
  action: Schema.Literals(["enroll-begin", "remove"]),
  commandId: PasskeyCommandId,
  flowId: RequestBindingFlowId,
  revision: PasskeyRevision,
  bindingDigest: TokenDigest.check(Schema.isMaxLength(256))
})

export type PasskeyActionChallenge = typeof PasskeyActionChallenge.Type

export const PasskeyActionAuthorization = Schema.Struct({
  challenge: PasskeyActionChallenge,
  evidence: PasskeyEvidence,
  requirement: PasskeyRequirement
})

export type PasskeyActionAuthorization = typeof PasskeyActionAuthorization.Type

export const PasskeyContext = Schema.Union([
  Schema.TaggedStruct("SignIn", {}),
  Schema.TaggedStruct("Registration", {
    fingerprint: TokenDigest.check(Schema.isMaxLength(256)),
    userHandle: PasskeyUserHandle,
    name: PasskeyLabel,
    displayName: PasskeyLabel
  }),
  Schema.TaggedStruct("Enrollment", {
    revision: PasskeyRevision,
    userHandle: PasskeyUserHandle,
    name: PasskeyLabel,
    authorization: PasskeyActionAuthorization
  }),
  Schema.TaggedStruct("Pending", { target: PasskeyTarget }),
  Schema.TaggedStruct("StepUp", { target: PasskeyTarget }),
  Schema.TaggedStruct("Action", { target: PasskeyTarget })
])

export type PasskeyContext = typeof PasskeyContext.Type

export const PasskeyPurpose = Schema.Literals([
  "sign-in",
  "registration",
  "enrollment",
  "pending",
  "step-up",
  "action"
])

export type PasskeyPurpose = typeof PasskeyPurpose.Type

export const PasskeyCeremony = Schema.Struct({
  moduleId: PasskeyModuleId,
  flowId: RequestBindingFlowId,
  commandId: PasskeyCommandId,
  purpose: PasskeyPurpose,
  profile: PasskeyProfile,
  challenge: PasskeyChallenge,
  requestBindingVerifier: TokenDigest.check(Schema.isMaxLength(256)),
  requestBindingExpiresAtMillis: PasskeyInstant,
  issuedAtMillis: PasskeyInstant,
  expiresAtMillis: PasskeyInstant,
  allowedCredentials: Schema.Array(PasskeyDescriptor).check(Schema.isMaxLength(64)),
  context: PasskeyContext
})

export type PasskeyCeremony = typeof PasskeyCeremony.Type

export const PasskeyAccess = Schema.Struct({
  moduleId: PasskeyModuleId,
  purpose: PasskeyPurpose,
  flowId: RequestBindingFlowId,
  requestBindingVerifier: TokenDigest.check(Schema.isMaxLength(256)),
  requestBindingExpiresAtMillis: PasskeyInstant
})

export type PasskeyAccess = typeof PasskeyAccess.Type

export const PasskeyRegistrationVerified = Schema.Struct({
  protocolCredentialId: PasskeyProtocolCredentialId,
  publicKey: PasskeyPublicKey,
  algorithm: Schema.Literals([-7, -257]),
  userVerified: Schema.Boolean,
  backupEligible: Schema.Boolean,
  backupState: Schema.Boolean,
  counter: PasskeyCounter
})

export type PasskeyRegistrationVerified = typeof PasskeyRegistrationVerified.Type

export const PasskeyAssertionVerified = Schema.Struct({
  protocolCredentialId: PasskeyProtocolCredentialId,
  userHandle: Schema.optionalKey(PasskeyUserHandle),
  userVerified: Schema.Boolean,
  backupEligible: Schema.Boolean,
  backupState: Schema.Boolean,
  counter: PasskeyCounter
})

export type PasskeyAssertionVerified = typeof PasskeyAssertionVerified.Type

export const PasskeyIssueDecision = Schema.Union([
  Schema.TaggedStruct("Issued", { ceremony: PasskeyCeremony }),
  Schema.TaggedStruct("Rejected", {})
])

export type PasskeyIssueDecision = typeof PasskeyIssueDecision.Type

export const PasskeyConsumeDecision = Schema.Literals(["Verified", "Rejected"])
export type PasskeyConsumeDecision = typeof PasskeyConsumeDecision.Type

export const PasskeyBegin = Schema.Struct({
  flowId: RequestBindingFlowId,
  commandId: PasskeyCommandId,
  profileId: PasskeyProfileId
})

export type PasskeyBegin = typeof PasskeyBegin.Type

export const PasskeyAssertion = Schema.RedactedFromValue(
  Schema.NonEmptyString.check(
    Schema.isMaxLength(65536),
    Schema.makeFilter((value) => new TextEncoder().encode(value).length <= 65536)
  )
)

export const PasskeyAttestation = Schema.RedactedFromValue(
  Schema.NonEmptyString.check(
    Schema.isMaxLength(262144),
    Schema.makeFilter((value) => new TextEncoder().encode(value).length <= 262144)
  )
)

export const PasskeyComplete = Schema.Struct({
  flowId: RequestBindingFlowId,
  bindingCredential: RequestBindingCredential,
  response: PasskeyAssertion
})

export type PasskeyComplete = typeof PasskeyComplete.Type

export const PasskeyRegistrationComplete = Schema.Struct({
  ...PasskeyComplete.fields,
  response: PasskeyAttestation
})

export type PasskeyRegistrationComplete = typeof PasskeyRegistrationComplete.Type

export const PasskeyAuthenticationStarted = Schema.Struct({
  flowId: RequestBindingFlowId,
  expiresAtMillis: PasskeyInstant,
  options: PasskeyAuthenticationOptions
})

export type PasskeyAuthenticationStarted = typeof PasskeyAuthenticationStarted.Type

export const PasskeyRegistrationStarted = Schema.Struct({
  flowId: RequestBindingFlowId,
  expiresAtMillis: PasskeyInstant,
  options: PasskeyRegistrationOptions
})

export type PasskeyRegistrationStarted = typeof PasskeyRegistrationStarted.Type

export const PasskeyEnrolled = Schema.Struct({
  credential: PasskeyCredentialSummary
})

export const PasskeyRemoved = Schema.Struct({
  credentialId: PasskeyCredentialId,
  invalidation: SessionInvalidationWindow
})

export const PasskeyRegistrationResult = Schema.TaggedStruct("RegistrationAccepted", {})

export type PasskeyRegistrationResult = typeof PasskeyRegistrationResult.Type
