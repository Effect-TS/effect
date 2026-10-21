import * as Schema from "effect/Schema"

import { AssuranceEvidence, AuthenticationAssurance } from "../operations/context.ts"
import { RequestBindingFlowId } from "../operations/requestBinding.ts"
import { SecurityRevision } from "../sessions/models.ts"
import { OAuthAccountRevision, OAuthActionAuthorization, OAuthActionDigest } from "./accountsModels.ts"
import {
  OAuthConnectedProfile,
  OAuthConnectedResources,
  OAuthConnectedScopes,
  OAuthGrantId,
  OAuthPermissionProfileKey
} from "./permissionProfile.ts"
import { OAuthProviderKey } from "./schema.ts"
import {
  OAuthCallbackId,
  OAuthClaimId,
  OAuthCommandId,
  OAuthCredentialSnapshot,
  OAuthDisplayProfile,
  OAuthExternalIdentity,
  OAuthInstant,
  OAuthModuleId,
  OAuthProtocolConfiguration,
  OAuthSealedTransaction,
  OAuthSignInAccess,
  OAuthSignInComplete,
  OAuthSignInFlow,
  OAuthSignInPolicy,
  OAuthSignInTransactionContext,
  OAuthTransactionSecrets
} from "./signInModels.ts"

const revision = SecurityRevision.check(Schema.isMaxLength(256))

export { OAuthGrantId } from "./permissionProfile.ts"

export {
  OAuthConnectedProfile,
  OAuthConnectedResources,
  OAuthConnectedScopes,
  OAuthPermissionProfileKey
} from "./permissionProfile.ts"

export const OAuthConnectedPolicy = Schema.Struct({
  ...OAuthSignInPolicy.fields,
  maximumEvidenceAgeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 300000 })),
  refreshClaimLifetimeMillis: Schema.Int.check(
    Schema.isBetween({ minimum: 1000, maximum: 300000 })
  ),
  profiles: Schema.NonEmptyArray(OAuthConnectedProfile).check(Schema.isMaxLength(64))
})

export type OAuthConnectedPolicy = typeof OAuthConnectedPolicy.Type

export class OAuthConnectedBusy extends Schema.TaggedError<OAuthConnectedBusy>()(
  "OAuthConnectedBusy",
  {}
) {}

export class OAuthConnectedReauthorizationRequired extends Schema.TaggedError<OAuthConnectedReauthorizationRequired>()(
  "OAuthConnectedReauthorizationRequired",
  {}
) {}

export class OAuthConnectedActionRequired extends Schema.TaggedError<OAuthConnectedActionRequired>()(
  "OAuthConnectedActionRequired",
  {}
) {}

export const OAuthConnectedConfiguration = Schema.Struct({
  ...OAuthProtocolConfiguration.fields,
  profile: OAuthConnectedProfile
})

export type OAuthConnectedConfiguration = typeof OAuthConnectedConfiguration.Type

export const OAuthConnectedIntent = Schema.Union([
  Schema.TaggedStruct("Connect", {
    provider: OAuthProviderKey,
    profileKey: OAuthPermissionProfileKey
  }),
  Schema.TaggedStruct("Reconnect", {
    grantId: OAuthGrantId,
    profileKey: OAuthPermissionProfileKey
  })
])

export const OAuthConnectedBegin = Schema.Struct({
  flowId: RequestBindingFlowId,
  callbackId: OAuthCallbackId,
  intent: OAuthConnectedIntent,
  returnTarget: Schema.String.check(Schema.isMaxLength(2048)),
  actionProof: Schema.optionalKey(
    Schema.RedactedFromValue(Schema.NonEmptyString.check(Schema.isMaxLength(16384)))
  )
})

export const OAuthConnectedComplete = Schema.Struct({
  ...OAuthSignInComplete.fields,
  actionProof: OAuthConnectedBegin.fields.actionProof
})

export const OAuthConnectedDisconnect = Schema.Struct({
  commandId: OAuthCommandId,
  grantId: OAuthGrantId,
  actionProof: OAuthConnectedBegin.fields.actionProof
})

export const OAuthConnectedList = Schema.Struct({
  limit: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 })),
  cursor: Schema.optionalKey(Schema.NonEmptyString.check(Schema.isMaxLength(1024)))
})

export const OAuthConnectedUse = Schema.Struct({
  grantId: OAuthGrantId,
  profileKey: OAuthPermissionProfileKey
})

export const OAuthConnectedTarget = Schema.Struct({
  grantId: OAuthGrantId,
  grantVersion: revision,
  tokenVersion: revision,
  identity: OAuthExternalIdentity,
  configuration: OAuthConnectedConfiguration
})

export type OAuthConnectedTarget = typeof OAuthConnectedTarget.Type

export const OAuthConnectedActionChallenge = Schema.Struct({
  moduleId: OAuthModuleId,
  action: Schema.Literals(["connected-begin", "connected-complete", "connected-disconnect"]),
  flowId: RequestBindingFlowId,
  revision: OAuthAccountRevision,
  intentDigest: OAuthActionDigest,
  bindingDigest: OAuthActionDigest
})

export type OAuthConnectedActionChallenge = typeof OAuthConnectedActionChallenge.Type

export const OAuthConnectedActionAuthorization = Schema.Struct({
  ...OAuthActionAuthorization.fields,
  challenge: OAuthConnectedActionChallenge
})

export type OAuthConnectedActionAuthorization = typeof OAuthConnectedActionAuthorization.Type

/**
 * Authenticated caller sealed at begin so form_post completion can authorize without the session cookie.
 *
 * @internal
 */
export const OAuthConnectedCaller = Schema.TaggedStruct("Authenticated", {
  subjectId: OAuthAccountRevision.fields.subjectId,
  sessionId: Schema.optionalKey(Schema.String.check(Schema.isMaxLength(256))),
  assurance: Schema.Struct({
    ...AuthenticationAssurance.fields,
    method: Schema.NonEmptyString.check(Schema.isMaxLength(128)),
    factors: AuthenticationAssurance.fields.factors.check(Schema.isMaxLength(8)),
    evidence: Schema.optionalKey(
      Schema.NonEmptyArray(
        Schema.Struct({
          ...AssuranceEvidence.fields,
          method: Schema.NonEmptyString.check(Schema.isMaxLength(128)),
          factors: AssuranceEvidence.fields.factors.check(Schema.isMaxLength(8))
        })
      ).check(Schema.isMaxLength(64))
    )
  })
})

/** @internal */
export type OAuthConnectedCaller = typeof OAuthConnectedCaller.Type

/** Digest this immutable intent before adding its accepted begin authorization. */
export const OAuthConnectedIntentContext = Schema.Struct({
  ...OAuthSignInTransactionContext.fields,
  namespace: Schema.Literal("effect-auth/oauth-connected-context/v1"),
  revision: OAuthAccountRevision,
  profile: OAuthConnectedProfile,
  grantId: OAuthGrantId,
  reconnect: Schema.optionalKey(OAuthConnectedTarget),
  maximumEvidenceAgeMillis: OAuthConnectedPolicy.fields.maximumEvidenceAgeMillis,
  authenticatedCaller: Schema.optionalKey(OAuthConnectedCaller)
})

export type OAuthConnectedIntentContext = typeof OAuthConnectedIntentContext.Type

export const OAuthConnectedTransactionContext = Schema.Struct({
  ...OAuthConnectedIntentContext.fields,
  authorization: OAuthConnectedActionAuthorization
})

export type OAuthConnectedTransactionContext = typeof OAuthConnectedTransactionContext.Type

export const OAuthConnectedFlow = Schema.Struct({
  context: OAuthConnectedTransactionContext,
  sealed: OAuthSealedTransaction
})

export type OAuthConnectedFlow = typeof OAuthConnectedFlow.Type

export const OAuthConnectedUseAuthorization = Schema.Struct({
  moduleId: OAuthModuleId,
  revision: OAuthAccountRevision,
  policyRevision: revision,
  expiresAtMillis: OAuthInstant,
  purpose: Schema.Literals(["metadata", "use"]),
  grantId: Schema.optionalKey(OAuthGrantId),
  profileKey: Schema.optionalKey(OAuthPermissionProfileKey)
})

export type OAuthConnectedUseAuthorization = typeof OAuthConnectedUseAuthorization.Type

const token = Schema.RedactedFromValue(Schema.NonEmptyString.check(Schema.isMaxLength(16384)))
const numericDate = Schema.Finite.check(Schema.isBetween({ minimum: 0, maximum: 8640000000000 }))

export const OAuthConnectedContinuation = Schema.Union([
  Schema.TaggedStruct("Oidc", {
    clientId: Schema.NonEmptyString.check(Schema.isMaxLength(1024)),
    nonce: OAuthTransactionSecrets.fields.oidcNonce,
    authTime: Schema.optionalKey(numericDate),
    /** ID-token `sub` for verifier continuity when the durable subject differs. */
    subject: Schema.optionalKey(Schema.NonEmptyString.check(Schema.isMaxLength(1024))),
    /** Concrete ID-token `iss` from the original authentication. */
    issuer: Schema.optionalKey(
      Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(2048))
    )
  }),
  Schema.TaggedStruct("OAuth", {})
])

export const OAuthConnectedTokenMaterial = Schema.Struct({
  namespace: Schema.Literal("effect-auth/oauth-connected-token-material/v1"),
  accessToken: token,
  refreshToken: Schema.optionalKey(token),
  continuation: OAuthConnectedContinuation
})

export type OAuthConnectedTokenMaterial = typeof OAuthConnectedTokenMaterial.Type

export const OAuthConnectedGrantResponse = Schema.Struct({
  identity: OAuthExternalIdentity,
  profile: Schema.optionalKey(OAuthDisplayProfile),
  scopes: OAuthConnectedScopes,
  resources: OAuthConnectedResources,
  accessExpiresAtMillis: Schema.optionalKey(OAuthInstant),
  refreshExpiresAtMillis: Schema.optionalKey(OAuthInstant),
  material: OAuthConnectedTokenMaterial
})

export type OAuthConnectedGrantResponse = typeof OAuthConnectedGrantResponse.Type

export const OAuthConnectedTokenMetadata = Schema.Struct({
  scopes: OAuthConnectedScopes,
  resources: OAuthConnectedResources,
  accessExpiresAtMillis: Schema.optionalKey(OAuthInstant),
  refreshExpiresAtMillis: Schema.optionalKey(OAuthInstant),
  useUntilMillis: OAuthInstant,
  refreshUseUntilMillis: Schema.optionalKey(OAuthInstant),
  obtainedAtMillis: OAuthInstant,
  profile: Schema.optionalKey(OAuthDisplayProfile)
})

export const OAuthConnectedTokenContext = Schema.Struct({
  namespace: Schema.Literal("effect-auth/oauth-connected-token-context/v1"),
  moduleId: OAuthModuleId,
  subjectId: OAuthAccountRevision.fields.subjectId,
  identity: OAuthExternalIdentity,
  configuration: OAuthConnectedConfiguration,
  grantId: OAuthGrantId,
  grantVersion: revision,
  tokenVersion: revision,
  metadata: OAuthConnectedTokenMetadata
})

export type OAuthConnectedTokenContext = typeof OAuthConnectedTokenContext.Type

export const OAuthConnectedSealedTokens = Schema.Struct({
  format: Schema.Literal("oauth-connected-xchacha20poly1305-v1"),
  keyId: OAuthSealedTransaction.fields.keyId,
  nonce: OAuthSealedTransaction.fields.nonce,
  ciphertext: Schema.RedactedFromValue(
    Schema.String.check(
      Schema.isMinLength(22),
      Schema.isMaxLength(131094),
      Schema.isPattern(/^[A-Za-z0-9_-]+$/)
    )
  )
})

export type OAuthConnectedSealedTokens = typeof OAuthConnectedSealedTokens.Type

export const OAuthConnectedStoredGrant = Schema.Struct({
  context: OAuthConnectedTokenContext,
  sealed: OAuthConnectedSealedTokens
})

export type OAuthConnectedStoredGrant = typeof OAuthConnectedStoredGrant.Type

/** Advisory joined read; only a successful refresh CAS authorizes exchange. */
export const OAuthConnectedGrantSnapshot = Schema.Struct({
  ...OAuthConnectedStoredGrant.fields,
  state: Schema.Literals(["Active", "Refreshing", "ReauthorizationRequired"]),
  refreshClaimExpiresAtMillis: Schema.optionalKey(OAuthInstant)
})

export type OAuthConnectedGrantSnapshot = typeof OAuthConnectedGrantSnapshot.Type

/** Disconnect copies the exact persisted ciphertext; decrypt with grant.context.
 * Remote revocation may affect a later provider authorization. */
export const OAuthConnectedRevocationJob = Schema.Struct({
  jobId: OAuthClaimId,
  grant: OAuthConnectedStoredGrant
})

export type OAuthConnectedRevocationJob = typeof OAuthConnectedRevocationJob.Type

export const OAuthConnectedRefreshClaim = Schema.Struct({
  grant: OAuthConnectedStoredGrant,
  claimId: OAuthClaimId,
  claimedAtMillis: OAuthInstant,
  claimExpiresAtMillis: OAuthInstant,
  nextTokenVersion: revision
})

export type OAuthConnectedRefreshClaim = typeof OAuthConnectedRefreshClaim.Type

export const OAuthConnectedSummary = Schema.Struct({
  grantId: OAuthGrantId,
  provider: OAuthProviderKey,
  issuer: OAuthExternalIdentity.fields.issuer,
  profileKey: OAuthPermissionProfileKey,
  status: Schema.Literals(["Active", "Refreshing", "ReauthorizationRequired", "Disconnected"]),
  scopes: OAuthConnectedScopes,
  accessExpiresAtMillis: Schema.optionalKey(OAuthInstant),
  useUntilMillis: OAuthInstant,
  profile: Schema.optionalKey(OAuthDisplayProfile),
  remoteRevocation: Schema.Literals(["Pending", "Confirmed", "Unsupported", "Unknown"])
})

export const OAuthConnectedListResult = Schema.Struct({
  items: Schema.Array(OAuthConnectedSummary).check(Schema.isMaxLength(100)),
  cursor: OAuthConnectedList.fields.cursor
})

export const OAuthConnectedResult = Schema.Union([
  Schema.TaggedStruct("Connected", {
    grantId: OAuthGrantId,
    profileKey: OAuthPermissionProfileKey,
    status: Schema.Literal("Active"),
    returnTarget: OAuthConnectedTransactionContext.fields.returnTarget
  }),
  Schema.TaggedStruct("Cancelled", {
    returnTarget: OAuthConnectedTransactionContext.fields.returnTarget
  })
])

export const OAuthConnectedDisconnected = Schema.TaggedStruct("Disconnected", {
  grantId: OAuthGrantId,
  remoteRevocation: OAuthConnectedSummary.fields.remoteRevocation
})

export const OAuthConnectedAccess = Schema.Struct({
  ...OAuthSignInAccess.fields,
  subjectId: Schema.optionalKey(OAuthAccountRevision.fields.subjectId),
  /** Read the subject sealed at begin. Only a form_post continuation may be consumed this way. */
  formPostSubject: Schema.optionalKey(Schema.Literal(true))
}).check(
  Schema.makeFilter(
    (value) => (value.formPostSubject === true) !== (value.subjectId !== undefined)
  )
)

export type OAuthConnectedAccess = typeof OAuthConnectedAccess.Type

export const OAuthConnectedGrantKey = Schema.Struct({
  moduleId: OAuthModuleId,
  subjectId: OAuthAccountRevision.fields.subjectId,
  grantId: OAuthGrantId
})

export type OAuthConnectedGrantKey = typeof OAuthConnectedGrantKey.Type

/** Indexed target selection; an omitted selector captures only subject authority. */
export const OAuthConnectedReadInput = Schema.Struct({
  moduleId: OAuthModuleId,
  subjectId: OAuthAccountRevision.fields.subjectId,
  selector: Schema.optionalKey(
    Schema.Union([
      Schema.TaggedStruct("Grant", { grantId: OAuthGrantId }),
      Schema.TaggedStruct("Identity", {
        profileKey: OAuthPermissionProfileKey,
        identity: OAuthExternalIdentity
      })
    ])
  )
})

export type OAuthConnectedReadInput = typeof OAuthConnectedReadInput.Type

export const OAuthConnectedDisconnectIntent = Schema.Struct({
  key: OAuthConnectedGrantKey,
  grantVersion: revision
})

export const OAuthConnectedIssueDecision = Schema.Union([
  Schema.TaggedStruct("Issued", { flow: OAuthConnectedFlow }),
  Schema.TaggedStruct("Rejected", {})
])

export const OAuthConnectedConsumeDecision = Schema.Union([
  Schema.TaggedStruct("Consumed", { flow: OAuthConnectedFlow }),
  Schema.TaggedStruct("Rejected", {})
])

/** Consumed flows cannot be retried after an unknown exchange or commit. */
export const OAuthConnectedSettlement = Schema.Union([
  Schema.TaggedStruct("Connect", {
    flow: OAuthConnectedFlow,
    authorization: OAuthConnectedActionAuthorization,
    grant: OAuthConnectedStoredGrant
  }),
  Schema.TaggedStruct("SignIn", {
    flow: OAuthSignInFlow,
    credential: OAuthCredentialSnapshot,
    previous: Schema.optionalKey(OAuthConnectedTarget),
    grant: OAuthConnectedStoredGrant
  })
])

export type OAuthConnectedSettlement = typeof OAuthConnectedSettlement.Type

export const OAuthConnectedSettlementDecision = Schema.Union([
  Schema.TaggedStruct("Connected", { grant: OAuthConnectedStoredGrant }),
  Schema.TaggedStruct("Rejected", {}),
  Schema.TaggedStruct("Conflict", {})
])

export const OAuthConnectedDisconnectDecision = Schema.Union([
  OAuthConnectedDisconnected,
  Schema.TaggedStruct("Rejected", {})
])

export const OAuthConnectedRefreshDecision = Schema.Union([
  Schema.TaggedStruct("Claimed", { claim: OAuthConnectedRefreshClaim }),
  Schema.TaggedStruct("Busy", {}),
  Schema.TaggedStruct("ReauthorizationRequired", {}),
  Schema.TaggedStruct("Rejected", {})
])

export const OAuthConnectedRefreshOutcome = Schema.Union([
  Schema.TaggedStruct("Refreshed", {
    grant: OAuthConnectedStoredGrant
  }),
  Schema.TaggedStruct("ReauthorizationRequired", {})
])

export type OAuthConnectedRefreshOutcome = typeof OAuthConnectedRefreshOutcome.Type

export const OAuthConnectedRefreshSettlement = Schema.Union([
  Schema.TaggedStruct("Refreshed", { grant: OAuthConnectedStoredGrant }),
  Schema.TaggedStruct("ReauthorizationRequired", {}),
  Schema.TaggedStruct("Rejected", {})
])
