import * as Schema from "effect/Schema"

import { TokenDigest } from "../../Schema.ts"
import { AssuranceEvidence, AuthenticationAssurance } from "../operations/context.ts"
import { RequestBindingFlowId } from "../operations/requestBinding.ts"
import { SessionInvalidationWindow } from "../sessions/invalidation.ts"
import {
  AssuranceAlternative,
  AuthenticationEvidence,
  AuthenticationProof,
  AuthenticationRequirement,
  SessionId
} from "../sessions/models.ts"
import {
  OAuthCommandId,
  OAuthCredentialSnapshot,
  OAuthExternalIdentity,
  OAuthInstant,
  OAuthModuleId,
  OAuthSealedTransaction,
  OAuthSignInAccess,
  OAuthSignInBegin,
  OAuthSignInComplete,
  OAuthSignInPolicy,
  OAuthSignInTransactionContext
} from "./signInModels.ts"

export class OAuthActionRequired extends Schema.TaggedError<OAuthActionRequired>()(
  "OAuthActionRequired",
  {}
) {}

export const OAuthAccountsPolicy = Schema.Struct({
  ...OAuthSignInPolicy.fields,
  maximumEvidenceAgeMillis: Schema.Int.check(Schema.isBetween({ minimum: 1000, maximum: 300000 })),
  /** Applies only to unlink, including any positive session-cache window. */
  requireImmediateInvalidation: Schema.Boolean
})

export type OAuthAccountsPolicy = typeof OAuthAccountsPolicy.Type

export const OAuthActionDigest = TokenDigest.check(
  Schema.isPattern(/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/)
)

export const OAuthAccountRevision = OAuthCredentialSnapshot.fields.revision
export type OAuthAccountRevision = typeof OAuthAccountRevision.Type

/** A login identity, distinct from a retained provider API grant. These exact
 * nonsecret fields are safe for display; credentialId is the unlink target. */
export const OAuthLinkedAccount = Schema.Struct({
  credentialId: OAuthCredentialSnapshot.fields.credentialId,
  ...OAuthExternalIdentity.fields
})

export type OAuthLinkedAccount = typeof OAuthLinkedAccount.Type

export const OAuthLinkedAccountsList = Schema.Struct({
  limit: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 })),
  /** Opaque continuation within this caller and module; never grants access. */
  cursor: Schema.optionalKey(OAuthCredentialSnapshot.fields.credentialId)
})

export type OAuthLinkedAccountsList = typeof OAuthLinkedAccountsList.Type

export const OAuthLinkedAccountsListResult = Schema.Struct({
  items: Schema.Array(OAuthLinkedAccount).check(Schema.isMaxLength(100)),
  cursor: OAuthLinkedAccountsList.fields.cursor
})

export type OAuthLinkedAccountsListResult = typeof OAuthLinkedAccountsListResult.Type

/** Private persistence input. The invocation comes from verified Auth context,
 * never the public payload. Recheck metadata policy and current ownership at read. */
export const OAuthLinkedAccountsRead = Schema.Struct({
  ...OAuthLinkedAccountsList.fields,
  moduleId: OAuthModuleId,
  invocation: Schema.TaggedStruct("Authenticated", {
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
})

export type OAuthLinkedAccountsRead = typeof OAuthLinkedAccountsRead.Type

const proof = Schema.optionalKey(
  Schema.RedactedFromValue(Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(16384)))
)

export const OAuthLinkBegin = Schema.Struct({ ...OAuthSignInBegin.fields, actionProof: proof })
export const OAuthLinkComplete = Schema.Struct({ ...OAuthSignInComplete.fields })

export const OAuthUnlink = Schema.Struct({
  commandId: OAuthCommandId,
  credentialId: OAuthCredentialSnapshot.fields.credentialId,
  actionProof: proof
})

export const OAuthActionChallenge = Schema.Struct({
  moduleId: OAuthModuleId,
  action: Schema.Literals(["link-begin", "unlink"]),
  flowId: RequestBindingFlowId,
  revision: OAuthAccountRevision,
  /** Hash of the exact pre-authorization link intent or unlink credential. */
  intentDigest: OAuthActionDigest,
  bindingDigest: OAuthActionDigest
})

export type OAuthActionChallenge = typeof OAuthActionChallenge.Type

/** Session is accepted only with its exact private provenance, validated by the
 * application authority. Public assurance ordinals never identify credentials. */
export const OAuthActionSource = Schema.Union([
  Schema.TaggedStruct("Proof", {}),
  Schema.TaggedStruct("Session", {
    sessionId: SessionId.check(Schema.isMaxLength(256)),
    authenticatedAt: Schema.DateTimeUtcFromMillis
  })
])

export type OAuthActionSource = typeof OAuthActionSource.Type

export const OAuthActionAuthorization = Schema.Struct({
  challenge: OAuthActionChallenge,
  source: OAuthActionSource,
  /** Fixed at the accepted action; completion never refreshes its lifetime. */
  validUntilMillis: OAuthInstant,
  evidence: Schema.Struct({
    ...AuthenticationEvidence.fields,
    revision: OAuthAccountRevision,
    flowId: AuthenticationEvidence.fields.flowId.check(Schema.isMaxLength(256)),
    bindingDigest: OAuthActionDigest,
    proofs: Schema.NonEmptyArray(
      Schema.Struct({
        ...AuthenticationProof.fields,
        method: Schema.NonEmptyString.check(Schema.isMaxLength(128)),
        credentialId: OAuthCredentialSnapshot.fields.credentialId,
        factors: AuthenticationProof.fields.factors.check(Schema.isMaxLength(8))
      })
    ).check(Schema.isMaxLength(64))
  }),
  requirement: Schema.Struct({
    ...AuthenticationRequirement.fields,
    alternatives: Schema.NonEmptyArray(
      Schema.Struct({
        ...AssuranceAlternative.fields,
        factors: AssuranceAlternative.fields.factors.check(Schema.isMaxLength(8)),
        minimumCredentials: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 64 }))
      })
    ).check(Schema.isMaxLength(64))
  })
})

export type OAuthActionAuthorization = typeof OAuthActionAuthorization.Type

/** Hash this intent before authorizing it; the final encrypted context then
 * includes the accepted authorization without a self-referential digest. */
export const OAuthLinkIntentContext = Schema.Struct({
  ...OAuthSignInTransactionContext.fields,
  namespace: Schema.Literal("effect-auth/oauth-link-context/v1"),
  revision: OAuthAccountRevision,
  maximumEvidenceAgeMillis: OAuthAccountsPolicy.fields.maximumEvidenceAgeMillis
})

export type OAuthLinkIntentContext = typeof OAuthLinkIntentContext.Type

export const OAuthLinkTransactionContext = Schema.Struct({
  ...OAuthLinkIntentContext.fields,
  authorization: OAuthActionAuthorization
})

export type OAuthLinkTransactionContext = typeof OAuthLinkTransactionContext.Type

export const OAuthLinkFlow = Schema.Struct({
  context: OAuthLinkTransactionContext,
  sealed: OAuthSealedTransaction
})

export type OAuthLinkFlow = typeof OAuthLinkFlow.Type

export const OAuthLinked = Schema.TaggedStruct("Linked", {
  credentialId: OAuthCredentialSnapshot.fields.credentialId,
  changed: Schema.Boolean,
  returnTarget: OAuthLinkTransactionContext.fields.returnTarget
})

export const OAuthUnlinked = Schema.TaggedStruct("Unlinked", {
  credentialId: OAuthCredentialSnapshot.fields.credentialId,
  invalidation: SessionInvalidationWindow
})

export const OAuthLinkResult = Schema.Union([
  OAuthLinked,
  Schema.TaggedStruct("Cancelled", {
    returnTarget: OAuthLinkTransactionContext.fields.returnTarget
  })
])

export const OAuthLinkAccess = Schema.Struct({
  ...OAuthSignInAccess.fields,
  subjectId: Schema.optionalKey(OAuthAccountRevision.fields.subjectId),
  /** Read the subject sealed at begin. Only a form_post continuation may be consumed this way. */
  formPostSubject: Schema.optionalKey(Schema.Literal(true))
}).check(
  Schema.makeFilter(
    (value) => (value.formPostSubject === true) !== (value.subjectId !== undefined)
  )
)

export type OAuthLinkAccess = typeof OAuthLinkAccess.Type

export const OAuthLinkIssueDecision = Schema.Union([
  Schema.TaggedStruct("Issued", { flow: OAuthLinkFlow }),
  Schema.TaggedStruct("Rejected", {})
])

export const OAuthLinkConsumeDecision = Schema.Union([
  Schema.TaggedStruct("Consumed", { flow: OAuthLinkFlow }),
  Schema.TaggedStruct("Rejected", {})
])

export const OAuthLinkDecision = Schema.Union([
  Schema.TaggedStruct("Linked", { credential: OAuthCredentialSnapshot, changed: Schema.Boolean }),
  Schema.TaggedStruct("Rejected", {}),
  Schema.TaggedStruct("Conflict", {})
])

export const OAuthCredentialKey = Schema.Struct({
  moduleId: OAuthModuleId,
  subjectId: OAuthAccountRevision.fields.subjectId,
  credentialId: OAuthCredentialSnapshot.fields.credentialId
})

export type OAuthCredentialKey = typeof OAuthCredentialKey.Type

export const OAuthUnlinkDecision = Schema.Union([
  Schema.TaggedStruct("Unlinked", { result: OAuthUnlinked }),
  Schema.TaggedStruct("Rejected", {}),
  Schema.TaggedStruct("LastSignInMethod", {})
])
