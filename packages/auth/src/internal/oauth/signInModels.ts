import * as Schema from "effect/Schema"

import { SubjectId, TokenDigest } from "../../Schema.ts"
import { RequestBindingCredential, RequestBindingFlowId } from "../operations/requestBinding.ts"
import { CleanupLimit } from "../persistence/cleanup.ts"
import { AuthenticationRequirement, SecurityRevision } from "../sessions/models.ts"
import { returnTarget } from "../shared/returnTarget.ts"
import { OAuthConnectedProfile } from "./permissionProfile.ts"
import { OAuthGeneration, OAuthProviderKey } from "./schema.ts"

const label = (maximum: number) => Schema.String.check(Schema.isPattern(new RegExp(`^[A-Za-z0-9._:/-]{1,${maximum}}$`)))

export const OAuthModuleId = label(128).pipe(Schema.brand("effect-auth/OAuthModuleId"))
export const OAuthCommandId = label(256).pipe(Schema.brand("effect-auth/OAuthCommandId"))
export const OAuthCallbackId = label(128).pipe(Schema.brand("effect-auth/OAuthCallbackId"))

export const OAuthClaimId = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)).pipe(
  Schema.brand("effect-auth/OAuthClaimId")
)

/** @internal */
export { OAuthGeneration } from "./schema.ts"

export const OAuthInstant = Schema.Int.check(
  Schema.isBetween({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })
)

export const OAuthIssuer = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(2048),
  // oxlint-disable-next-line no-control-regex -- URI boundaries reject control characters.
  Schema.isPattern(/^[^\s\\\u0000-\u001f\u007f]+$/)
).pipe(Schema.brand("effect-auth/OAuthIssuer"))

export const OAuthRedirectUri = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(2048),
  // oxlint-disable-next-line no-control-regex -- URI boundaries reject control characters.
  Schema.isPattern(/^[^\s\\\u0000-\u001f\u007f#]+$/)
).pipe(Schema.brand("effect-auth/OAuthRedirectUri"))

export const OAuthReturnTarget = returnTarget.pipe(Schema.brand("effect-auth/OAuthReturnTarget"))

export const OAuthProtocolKind = Schema.Literals(["oidc", "oauth"])

export const OAuthProtocolConfiguration = Schema.Struct({
  provider: OAuthProviderKey,
  protocol: OAuthProtocolKind,
  configurationGeneration: OAuthGeneration,
  issuer: OAuthIssuer,
  responseIssuerMode: Schema.Literals(["required", "unsupported"]),
  callbackId: OAuthCallbackId,
  redirectUri: OAuthRedirectUri
})

export type OAuthProtocolConfiguration = typeof OAuthProtocolConfiguration.Type

export const OAuthSignInTransactionContext = Schema.Struct({
  namespace: Schema.Literal("effect-auth/oauth-sign-in-context/v1"),
  moduleId: OAuthModuleId,
  generation: OAuthGeneration,
  flowId: RequestBindingFlowId,
  ...OAuthProtocolConfiguration.fields,
  /** Captured permission/retention policy; part of the encrypted transaction context. */
  access: Schema.optionalKey(OAuthConnectedProfile),
  returnTarget: OAuthReturnTarget,
  stateDigest: TokenDigest.check(Schema.isMaxLength(43), Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)),
  requestBindingVerifier: TokenDigest.check(
    Schema.isMaxLength(43),
    Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)
  ),
  requestBindingExpiresAtMillis: OAuthInstant,
  issuedAtMillis: OAuthInstant,
  expiresAtMillis: OAuthInstant,
  exchangeTimeoutMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 120000 })),
  /** Captured at begin. form_post completion can recover the sealed caller without the session cookie. */
  responseMode: Schema.optionalKey(Schema.Literals(["query", "form_post"]))
})

export type OAuthSignInTransactionContext = typeof OAuthSignInTransactionContext.Type

const randomSecret = Schema.RedactedFromValue(
  Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/))
)

export const OAuthTransactionSecrets = Schema.Struct({
  namespace: Schema.Literal("effect-auth/oauth-transaction-secrets/v1"),
  state: randomSecret,
  pkceVerifier: Schema.optionalKey(
    Schema.RedactedFromValue(Schema.String.check(Schema.isPattern(/^[A-Za-z0-9._~-]{43,128}$/)))
  ),
  oidcNonce: Schema.optionalKey(randomSecret)
})

export type OAuthTransactionSecrets = typeof OAuthTransactionSecrets.Type
export const OAuthEncryptionKeyId = Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{1,64}$/))

export const OAuthSealedTransaction = Schema.Struct({
  format: Schema.Literal("oauth-xchacha20poly1305-v1"),
  keyId: OAuthEncryptionKeyId,
  nonce: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{32}$/)),
  ciphertext: Schema.RedactedFromValue(
    Schema.String.check(
      Schema.isMinLength(22),
      Schema.isMaxLength(21867),
      Schema.isPattern(/^[A-Za-z0-9_-]+$/)
    )
  )
})

export type OAuthSealedTransaction = typeof OAuthSealedTransaction.Type

export const OAuthAuthorizationUrl = Schema.RedactedFromValue(
  Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(16384))
)

export const OAuthProtocolPreparation = Schema.Struct({
  configuration: OAuthProtocolConfiguration,
  authorizationUrl: OAuthAuthorizationUrl,
  secrets: OAuthTransactionSecrets,
  responseMode: Schema.optionalKey(Schema.Literals(["query", "form_post"]))
})

export type OAuthProtocolPreparation = typeof OAuthProtocolPreparation.Type

export const OAuthExternalIdentity = Schema.Struct({
  provider: OAuthProviderKey,
  issuer: OAuthIssuer,
  subject: Schema.NonEmptyString.check(Schema.isMaxLength(1024))
})

const displayUrl = Schema.NonEmptyString.check(
  Schema.isMaxLength(2048),
  Schema.makeFilter((value) => {
    if (!/^https?:\/\//i.test(value) || /[\s\\\p{Cc}]/u.test(value)) return false

    try {
      const url = new URL(value)

      return (
        (url.protocol === "https:" || url.protocol === "http:") &&
        url.username === "" &&
        url.password === ""
      )
    } catch {
      return false
    }
  })
)

/** Provider-supplied metadata, never local identity or linking authority. Adapters
 * project identity responses into this bounded JSON snapshot; tokens and protocol
 * secrets do not belong here. Applications select their own public session claims. */
export const OAuthDisplayProfile = Schema.Struct({
  displayName: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  handle: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  /** Absolute HTTP(S) metadata; applications still decide whether to display or fetch it. */
  avatarUrl: Schema.optionalKey(displayUrl),
  profileUrl: Schema.optionalKey(displayUrl),
  email: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(320))),
  emailVerified: Schema.optionalKey(Schema.Boolean),
  /** Provider-specific fields. Declare profile schemas on the OAuth strategy for
   * typed SessionClaims, or decode with the provider's exported profile Schema.
   * Availability follows the existing provider permissions. */
  providerData: Schema.optionalKey(
    Schema.JsonObject.check(
      Schema.makeFilter(
        (value) => new TextEncoder().encode(JSON.stringify(value)).length <= 65_536
      )
    )
  )
})

export type OAuthDisplayProfile = typeof OAuthDisplayProfile.Type

export const OAuthVerifiedExternalIdentity = Schema.Struct({
  identity: OAuthExternalIdentity,
  upstreamAuthenticatedAt: Schema.optionalKey(Schema.DateTimeUtcFromMillis),
  profile: Schema.optionalKey(OAuthDisplayProfile)
})

export type OAuthVerifiedExternalIdentity = typeof OAuthVerifiedExternalIdentity.Type

export const OAuthCredentialSnapshot = Schema.Struct({
  /** Current policy from the same authoritative read as the revision vector. */
  requirement: AuthenticationRequirement,
  moduleId: OAuthModuleId,
  identity: OAuthExternalIdentity,
  credentialId: Schema.NonEmptyString.check(Schema.isMaxLength(256)),
  credentialRevision: SecurityRevision.check(Schema.isMaxLength(256)),
  revision: Schema.Struct({
    subjectId: SubjectId.check(Schema.isMaxLength(256)),
    securityRevision: SecurityRevision.check(Schema.isMaxLength(256)),
    credentials: Schema.Array(
      Schema.Struct({
        credentialId: Schema.NonEmptyString.check(Schema.isMaxLength(256)),
        revision: SecurityRevision.check(Schema.isMaxLength(256))
      })
    ).check(Schema.isMinLength(1), Schema.isMaxLength(64))
  })
})

export type OAuthCredentialSnapshot = typeof OAuthCredentialSnapshot.Type

/** The stored flow is deleted before the single provider exchange. */
export const OAuthSignInFlow = Schema.Struct({
  context: OAuthSignInTransactionContext,
  sealed: OAuthSealedTransaction
})

export type OAuthSignInFlow = typeof OAuthSignInFlow.Type

export const OAuthSignInAccess = Schema.Struct({
  moduleId: OAuthModuleId,
  generation: OAuthGeneration,
  flowId: RequestBindingFlowId,
  provider: OAuthProviderKey,
  callbackId: OAuthCallbackId,
  stateDigest: OAuthSignInTransactionContext.fields.stateDigest,
  requestBindingVerifier: OAuthSignInTransactionContext.fields.requestBindingVerifier,
  requestBindingExpiresAtMillis: OAuthInstant,
  responseIssuer: Schema.optionalKey(OAuthIssuer)
})

export type OAuthSignInAccess = typeof OAuthSignInAccess.Type

export const OAuthIssueDecision = Schema.Union([
  Schema.TaggedStruct("Issued", { flow: OAuthSignInFlow }),
  Schema.TaggedStruct("Rejected", {})
])

export type OAuthIssueDecision = typeof OAuthIssueDecision.Type

export const OAuthConsumeDecision = Schema.Union([
  Schema.TaggedStruct("Consumed", { flow: OAuthSignInFlow }),
  Schema.TaggedStruct("Rejected", {})
])

export type OAuthConsumeDecision = typeof OAuthConsumeDecision.Type

const responseBase = {
  state: Schema.RedactedFromValue(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2048))
  ),
  issuer: Schema.optionalKey(OAuthIssuer)
}

export const OAuthCodeResponse = Schema.TaggedStruct("Code", {
  ...responseBase,
  code: Schema.RedactedFromValue(
    Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(4096))
  ),
  /** Provider callback scope receipt; adapters must validate before trusting it. */
  scope: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(16384))),
  /** First-consent name payload. Apple sends this once as a `user` form field. */
  user: Schema.optionalKey(Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(4096))),
  error: Schema.optionalKey(Schema.Never)
})

export type OAuthCodeResponse = typeof OAuthCodeResponse.Type

export const OAuthCallbackResponse = Schema.Union([
  OAuthCodeResponse,
  Schema.TaggedStruct("Error", {
    ...responseBase,
    error: Schema.Literals(["access-denied", "rejected"]),
    code: Schema.optionalKey(Schema.Never)
  })
])

export const OAuthAuthorizationPrompt = Schema.Literals([
  "none",
  "login",
  "consent",
  "select_account"
])

export const OAuthLoginHint = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(1024))

/** Public sign-in request. The server generates its flow identity. */
export const OAuthSignInInput = Schema.Struct({
  provider: OAuthProviderKey,
  callbackId: Schema.optionalKey(OAuthCallbackId),
  returnTarget: Schema.String.check(Schema.isMaxLength(2048)),
  prompt: Schema.optionalKey(OAuthAuthorizationPrompt),
  loginHint: Schema.optionalKey(OAuthLoginHint)
})

export const OAuthSignInBegin = Schema.Struct({
  flowId: RequestBindingFlowId,
  ...OAuthSignInInput.fields
})

export const OAuthSignInComplete = Schema.Struct({
  flowId: RequestBindingFlowId,
  provider: OAuthProviderKey,
  callbackId: OAuthCallbackId,
  requestBinding: RequestBindingCredential,
  response: OAuthCallbackResponse
})

export const OAuthSignInAuthorization = Schema.Struct({
  flowId: RequestBindingFlowId,
  authorizationUrl: OAuthAuthorizationUrl,
  expiresAtMillis: OAuthInstant
})

export const OAuthSignInPolicy = Schema.Struct({
  generation: OAuthGeneration,
  lifetimeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 1800000 })),
  exchangeTimeoutMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 120000 }))
})

export type OAuthSignInPolicy = typeof OAuthSignInPolicy.Type

export const OAuthCleanupInput = Schema.Struct({
  moduleId: OAuthModuleId,
  limit: CleanupLimit
})

export type OAuthCleanupInput = typeof OAuthCleanupInput.Type

export const defaultOAuthSignInPolicy: OAuthSignInPolicy = {
  generation: 1,
  lifetimeMillis: 300_000,
  exchangeTimeoutMillis: 30_000
}
