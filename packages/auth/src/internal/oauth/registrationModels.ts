import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import { RequestBindingCredential, RequestBindingFlowId } from "../operations/requestBinding.ts"
import {
  OAuthCommandId,
  OAuthCredentialSnapshot,
  OAuthDisplayProfile,
  OAuthExternalIdentity,
  OAuthInstant,
  OAuthModuleId,
  OAuthSignInTransactionContext,
  OAuthVerifiedExternalIdentity
} from "./signInModels.ts"

export const OAuthRegistrationFingerprint = TokenDigest.check(Schema.isMaxLength(256))

export const OAuthRegistrationBearerDigest = TokenDigest.check(
  Schema.isPattern(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/)
)

export const OAuthRegistrationReference = Schema.String.check(
  Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)
).pipe(Schema.brand("effect-auth/OAuthRegistrationReference"))

export type OAuthRegistrationReference = typeof OAuthRegistrationReference.Type

export const OAuthRegistrationCredential = Schema.RedactedFromValue(
  Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))
)

export const OAuthRegistrationPolicy = Schema.Struct({
  lifetimeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 1800000 })),
  maximumVerificationAgeMillis: Schema.Int.check(
    Schema.isBetween({ minimum: 1000, maximum: 1800000 })
  ),
  retentionMillis: Schema.Int.check(Schema.isBetween({ minimum: 120000, maximum: 2592000000 }))
})

export type OAuthRegistrationPolicy = typeof OAuthRegistrationPolicy.Type

/** Immutable restricted capability. Application data is first bound by register,
 * never by the OAuth callback; this record contains no plaintext bearer or tokens. */
export const OAuthRegistrationIntent = Schema.Struct({
  namespace: Schema.Literal("effect-auth/oauth-registration-intent/v1"),
  reference: OAuthRegistrationReference,
  context: OAuthSignInTransactionContext,
  identity: OAuthExternalIdentity,
  /** Original authenticated provider snapshot, available only to server-side
   * provisioning authority. It is not caller-supplied registration data. */
  profile: Schema.optionalKey(OAuthDisplayProfile),
  upstreamAuthenticatedAt: OAuthVerifiedExternalIdentity.fields.upstreamAuthenticatedAt,
  verifiedAtMillis: OAuthInstant,
  credentialDigest: OAuthRegistrationBearerDigest,
  issuedAtMillis: OAuthInstant,
  expiresAtMillis: OAuthInstant,
  retentionUntilMillis: OAuthInstant
})

export type OAuthRegistrationIntent = typeof OAuthRegistrationIntent.Type

export const OAuthRegistrationRequired = Schema.TaggedStruct("RegistrationRequired", {
  reference: OAuthRegistrationReference,
  expiresAtMillis: OAuthInstant,
  returnTarget: OAuthSignInTransactionContext.fields.returnTarget
})

export const OAuthRegistrationAccess = Schema.Struct({
  moduleId: OAuthModuleId,
  reference: OAuthRegistrationReference,
  flowId: RequestBindingFlowId,
  requestBindingVerifier: OAuthSignInTransactionContext.fields.requestBindingVerifier,
  requestBindingExpiresAtMillis: OAuthInstant,
  credentialDigest: OAuthRegistrationBearerDigest
})

export type OAuthRegistrationAccess = typeof OAuthRegistrationAccess.Type

export const OAuthRegistrationPrivateInput = Schema.Struct({
  reference: OAuthRegistrationReference,
  flowId: RequestBindingFlowId,
  requestBinding: RequestBindingCredential,
  credential: OAuthRegistrationCredential,
  commandId: OAuthCommandId
})

export const OAuthRegistrationRequestId = Schema.NonEmptyString.check(Schema.isMaxLength(256))

const applicationBinding = {
  commandId: OAuthCommandId,
  fingerprint: OAuthRegistrationFingerprint,
  /** Original registration codec output; compare exact bytes on every replay. */
  payload: Schema.String,
  requestId: OAuthRegistrationRequestId
}

/** A first accepted command atomically reaches one bound outcome. There is no
 * resettable intermediate state that permits a second provisioning attempt.
 * Bound outcomes retain the original payload and stable provisioning request ID.
 * Replay returns outcome metadata only, with no provisioning, event or new credential. */
export const OAuthRegistrationApplication = Schema.Union([
  Schema.TaggedStruct("Unbound", {}),
  Schema.TaggedStruct("Registered", applicationBinding),
  Schema.TaggedStruct("Rejected", applicationBinding)
])

export const OAuthRegistrationInspection = Schema.Struct({
  intent: OAuthRegistrationIntent,
  application: OAuthRegistrationApplication
})

export type OAuthRegistrationInspection = typeof OAuthRegistrationInspection.Type

/** Private first-winner handoff; never persist it or reconstruct it from a replay. */
export const OAuthRegistrationAuthentication = Schema.Struct({
  intent: OAuthRegistrationIntent,
  credentialId: OAuthCredentialSnapshot.fields.credentialId,
  credentialRevision: OAuthCredentialSnapshot.fields.credentialRevision,
  revision: OAuthCredentialSnapshot.fields.revision
})

export type OAuthRegistrationAuthentication = typeof OAuthRegistrationAuthentication.Type

export const OAuthRegistrationDecision = Schema.Union([
  Schema.TaggedStruct("Registered", {
    replayed: Schema.Literal(false),
    authentication: Schema.optionalKey(OAuthRegistrationAuthentication)
  }),
  Schema.TaggedStruct("Registered", {
    replayed: Schema.Literal(true),
    authentication: Schema.optionalKey(Schema.Never)
  }),
  Schema.TaggedStruct("Rejected", {}),
  Schema.TaggedStruct("Conflict", {})
])

export type OAuthRegistrationDecision = typeof OAuthRegistrationDecision.Type

/** Metadata-only acceptance, including every replay after an uncertain outcome. */
export const OAuthRegistrationResult = Schema.TaggedStruct("RegistrationAccepted", {})

export const registrationCompletionResult = <S extends Schema.Top>(completion: S) =>
  Schema.Union([OAuthRegistrationResult, completion])
