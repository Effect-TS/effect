import type * as OAuth from "@effect/auth/OAuth"

import type { SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { SubjectIdCodec } from "./common.ts"
import type {
  OAuthAuthorityReadTable,
  OAuthClock,
  OAuthCredentialReadTable,
  OAuthFlowTable,
  OAuthOwnershipReadTable,
  OAuthOwnershipTable,
  OAuthSubjectReadTable
} from "./oauthModel.ts"

type Column<T extends Table> = T["column"]
export type OAuthConnectedAction = OAuth.OAuthConnectedActionChallenge["action"]

/** Immutable sealed data plus the exact refresh compare-and-set fields. */
export interface OAuthConnectedGrantTable<G extends Table, N> {
  readonly table: G["table"]
  readonly moduleId: Column<G>
  readonly grantId: Column<G>
  readonly subjectId: Column<G>
  readonly identityKey: Column<G>
  readonly profileKey: Column<G>
  readonly grantVersion: Column<G>
  readonly tokenVersion: Column<G>
  readonly state: Column<G>
  readonly snapshot: Column<G>
  /** Listing selects this bounded projection, never encrypted token material. */
  readonly summary: Column<G>
  readonly refreshClaimId: Column<G>
  readonly refreshNextTokenVersion: Column<G>
  readonly refreshClaimedAt: Column<G>
  readonly refreshClaimExpiresAt: Column<G>
  readonly expiresAt: Column<G>
  readonly encodeInsert: (input: {
    readonly grant: OAuth.OAuthConnectedStoredGrant
    readonly subjectId: N
  }) => G["insert"]
}

/** Optional provider revocation retains the exact removed grant ciphertext. A
 * possibly spent claim is never reset to Pending or reclaimed after timeout. */
export interface OAuthConnectedRevocationJobTable<J extends Table, N> {
  readonly table: J["table"]
  readonly jobId: Column<J>
  readonly moduleId: Column<J>
  readonly subjectId: Column<J>
  readonly identityKey: Column<J>
  readonly snapshot: Column<J>
  readonly state: Column<J>
  readonly claimId: Column<J>
  readonly claimedAt: Column<J>
  readonly claimExpiresAt: Column<J>
  readonly retentionUntil: Column<J>
  readonly encodeInsert: (input: {
    readonly job: OAuth.OAuthConnectedRevocationJob
    readonly subjectId: N
  }) => J["insert"]
}

export type OAuthConnectedPolicyInput<N> =
  & {
    readonly subjectId: N
    readonly revision: OAuth.OAuthAccountRevision
  }
  & (
    | {
      readonly kind: "action"
      readonly operation: "settle" | "disconnect"
      readonly authorization: OAuth.OAuthConnectedActionAuthorization
      readonly grant?: OAuth.OAuthConnectedTokenContext
    }
    | {
      readonly kind: "sign-in"
      readonly credential: OAuth.OAuthCredentialSnapshot
      readonly grant: OAuth.OAuthConnectedTokenContext
    }
    | {
      readonly kind: "metadata" | "use"
      readonly authorization: OAuth.OAuthConnectedUseAuthorization
      readonly grant?: OAuth.OAuthConnectedTokenContext
    }
  )

/** Changes to mutable policy advance the same subject security revision. This
 * predicate participates in the guarded write and final application postcondition. */
export interface OAuthConnectedSqlPolicy<N, Expression extends SqlExpression = SqlExpression> {
  readonly condition: (input: OAuthConnectedPolicyInput<N>) => Expression
}

export const requiredOAuthConnectedConstraints = {
  flow: "unique(flow.moduleId,flow.flowId)",
  stateDigest: "unique(flow.stateDigest)",
  ownership: "unique(ownership.identityKey)",
  grant: "unique(connectedGrant.moduleId,connectedGrant.grantId)",
  activeIdentity:
    "unique(connectedGrant.moduleId,connectedGrant.subjectId,connectedGrant.profileKey,connectedGrant.identityKey)",
  authorityCredential: "unique(authority.subjectId,authority.credentialId)"
} as const

export const requiredOAuthConnectedRevocationConstraints = {
  job: "unique(connectedRevocation.jobId)"
} as const

export interface OAuthConnectedMapping<
  S extends Table,
  AC extends Table,
  O extends Table,
  F extends Table,
  G extends Table,
  N,
  J extends Table = Table,
  Expression extends SqlExpression = SqlExpression,
  SignIn extends Table = Table
> {
  readonly ownership: OAuthOwnershipTable<O, N>
  readonly subject: OAuthSubjectReadTable<S, Expression>
  readonly authority: OAuthAuthorityReadTable<AC, Expression>
  readonly subjectId: SubjectIdCodec<N>
  readonly flow: OAuthFlowTable<F>
  readonly grant: OAuthConnectedGrantTable<G, N>
  readonly credential?: OAuthCredentialReadTable<SignIn, Expression>
  readonly clock: OAuthClock<Expression>
  readonly policy: OAuthConnectedSqlPolicy<N, Expression>
  readonly constraints: typeof requiredOAuthConnectedConstraints
  readonly revocation:
    | { readonly mode: "unsupported" }
    | {
      readonly mode: "provider"
      readonly job: OAuthConnectedRevocationJobTable<J, N>
      readonly retentionMillis: number
      readonly constraints: typeof requiredOAuthConnectedRevocationConstraints
    }
  /** Indexed same-owner predicate for installed references beyond these grants/jobs. */
  readonly otherReferences: (input: {
    readonly identityKey: string
    readonly subjectId: N
  }) => Expression
}

export interface OAuthConnectedRevocationMapping<
  O extends Table,
  G extends Table,
  J extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly ownership: OAuthOwnershipReadTable<O, N>
  readonly subjectId: SubjectIdCodec<N>
  readonly grant: Omit<OAuthConnectedGrantTable<G, N>, "encodeInsert">
  readonly job: Omit<OAuthConnectedRevocationJobTable<J, N>, "encodeInsert">
  readonly clock: OAuthClock<Expression>
  readonly otherReferences: (input: {
    readonly identityKey: string
    readonly subjectId: N
  }) => Expression
  readonly constraints: typeof requiredOAuthConnectedRevocationConstraints
}
