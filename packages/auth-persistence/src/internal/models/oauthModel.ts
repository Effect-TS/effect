import type { PreparedCommit } from "@effect/auth/Hooks"
import type {
  OAuthAccountRevision,
  OAuthActionAuthorization,
  OAuthCleanupInput,
  OAuthCommandId,
  OAuthExternalIdentity,
  OAuthLinkedAccountsRead,
  OAuthRegistrationAccess,
  OAuthRegistrationDecision,
  OAuthRegistrationInspection,
  OAuthRegistrationIntent,
  OAuthUnavailable,
  PrepareOAuthCommit
} from "@effect/auth/OAuth"
import { AuthenticationFactor } from "@effect/auth/Operations"
import type { CleanupResult } from "@effect/auth/Persistence"
import type { TokenDigest } from "@effect/auth/Schema"
import { type AuthenticationRequirement, SecurityRevision } from "@effect/auth/Sessions"
import type * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

import type { SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { PersistenceMappingError, SubjectIdCodec } from "./common.ts"

type Column<T extends Table> = T["column"]
export type OAuthAction = OAuthActionAuthorization["challenge"]["action"]

export interface OAuthClock<Expression extends SqlExpression = SqlExpression> {
  readonly encodeInstant: (millis: number) => unknown
  readonly decodeInstant: (value: unknown) => number
  /** Actual engine wall clock sampled after locks, not transaction-start time.
   * PostgreSQL uses clock_timestamp(), never now()/CURRENT_TIMESTAMP. D1 repeats
   * its primary-engine sample bounds in final guards. Return integer milliseconds. */
  readonly engineNowMillis: Expression
  /** Convert a stored timestamp expression to integer milliseconds. */
  readonly toMillis: (expression: Expression) => Expression
  readonly fromMillis: (expression: Expression) => Expression
}

export interface OAuthSubjectReadTable<
  S extends Table,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: S["table"]
  readonly id: Column<S>
  readonly status: Column<S>
  readonly securityRevision: Column<S>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeCondition: Expression
  readonly decodeAuthenticationRequirement: (
    row: S["select"]
  ) =>
    | AuthenticationRequirement
    | Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
}

export interface OAuthSubjectTable<
  S extends Table,
  Expression extends SqlExpression = SqlExpression
> extends OAuthSubjectReadTable<S, Expression> {
  readonly nextSecurityRevision: (current: SecurityRevision) => SecurityRevision
}

export interface OAuthOwnershipReadTable<O extends Table, N> {
  readonly table: O["table"]
  readonly identityKey: Column<O>
  readonly provider: Column<O>
  readonly issuer: Column<O>
  readonly externalSubject: Column<O>
  readonly subjectId: Column<O>
  readonly decodeSubjectId: (row: O["select"]) => N
}

export interface OAuthOwnershipTable<O extends Table, N> extends OAuthOwnershipReadTable<O, N> {
  readonly encodeInsert: (input: {
    readonly identity: typeof OAuthExternalIdentity.Type
    readonly identityKey: string
    readonly subjectId: N
  }) => O["insert"]
}

export interface OAuthCredentialReadTable<
  C extends Table,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: C["table"]
  readonly moduleId: Column<C>
  readonly credentialId: Column<C>
  readonly subjectId: Column<C>
  readonly identityKey: Column<C>
  readonly credentialRevision: Column<C>
  readonly status: Column<C>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeCondition: Expression
}

export interface OAuthCredentialTable<
  C extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> extends OAuthCredentialReadTable<C, Expression> {
  readonly encodeInsert: (input: {
    readonly moduleId: string
    readonly subjectId: N
    readonly identityKey: string
    readonly credentialId: string
    readonly credentialRevision: SecurityRevision
  }) => C["insert"]
  /** This slice removes login rows. Historical records belong in separate audit storage. */
  readonly removal: "delete"
}

export interface OAuthAuthorityReadTable<
  C extends Table,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: C["table"]
  readonly subjectId: Column<C>
  readonly credentialId: Column<C>
  readonly revision: Column<C>
  readonly status: Column<C>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeCondition: Expression
}

export interface OAuthAuthorityTable<
  C extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> extends OAuthAuthorityReadTable<C, Expression> {
  readonly encodeInsert: (input: {
    readonly subjectId: N
    readonly credentialId: string
    readonly revision: SecurityRevision
  }) => C["insert"]
}

/** Live ceremonies only. Predicate columns enforce access before deletion; the
 * snapshot retains the exact authenticated context and encrypted protocol data. */
export interface OAuthFlowTable<F extends Table> {
  readonly table: F["table"]
  readonly moduleId: Column<F>
  readonly flowId: Column<F>
  readonly purpose: Column<F>
  readonly generation: Column<F>
  readonly provider: Column<F>
  readonly callbackId: Column<F>
  readonly issuer: Column<F>
  readonly responseIssuerMode: Column<F>
  readonly subjectId: Column<F>
  readonly stateDigest: Column<F>
  readonly binderVerifier: Column<F>
  readonly binderExpiresAt: Column<F>
  readonly snapshot: Column<F>
  readonly issuedAt: Column<F>
  readonly expiresAt: Column<F>
  readonly encodeInsert: (input: {
    readonly moduleId: string
    readonly flowId: string
    readonly purpose: "sign-in" | "link" | "connect"
  }) => F["insert"]
}

export const OAuthEligibilityFact = Schema.Struct({
  credentialId: Schema.NonEmptyString.check(Schema.isMaxLength(256)),
  revision: SecurityRevision,
  usablePrimary: Schema.Boolean,
  factors: Schema.Array(AuthenticationFactor).check(Schema.isMaxLength(8)),
  userVerified: Schema.Boolean,
  phishingResistant: Schema.Boolean
})

export type OAuthEligibilityFact = typeof OAuthEligibilityFact.Type

/** Each descriptor reads only its own subject-scoped method rows. The native row
 * projector and SQL condition must express the same installed method eligibility.
 * All source/identifier/policy mutations advance subject securityRevision. D1 also
 * guards exact selected IDs/versions and absence/count assumptions, never just a
 * stale boolean. An over-limit graph fails closed rather than truncating. */
export interface OAuthEligibilityTable<
  T extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: T["table"]
  readonly subjectId: Column<T>
  readonly credentialId: Column<T>
  readonly revision: Column<T>
  readonly scope: string
  readonly condition: (subjectId: N) => Expression
  readonly decode: (row: T["select"]) => OAuthEligibilityFact | undefined
}

export interface OAuthCleanupTable<
  T extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: T["table"]
  readonly subjectId: Column<T>
  /** Bound to this subject's old revision; no opaque independently committing service. */
  readonly condition: (input: {
    readonly subjectId: N
    readonly revision: OAuthAccountRevision
    readonly removedCredentialId?: string
  }) => Expression
  readonly disposition: "delete"
}

export interface OAuthRegistrationGuardTable<
  T extends Table,
  Registration,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: T["table"]
  readonly orderBy: Column<T>
  readonly condition: (input: {
    readonly intent: OAuthRegistrationIntent
    readonly registration: Registration
    readonly nativeSubjectId?: N
  }) => Expression
}

export interface OAuthRegistrationGuardDescriptor<
  Registration,
  N,
  Expression extends SqlExpression = SqlExpression,
  Descriptor extends object = object
> {
  readonly table: Descriptor
  readonly orderBy: string
  readonly condition: OAuthRegistrationGuardTable<Table, Registration, N, Expression>["condition"]
}

export const oauthRegistrationGuardTable = <
  T extends Table,
  Registration,
  N,
  Expression extends SqlExpression = SqlExpression
>(
  input: OAuthRegistrationGuardTable<T, Registration, N, Expression>
): OAuthRegistrationGuardDescriptor<Registration, N, Expression, T["table"]> =>
  Object.freeze({
    table: input.table,
    orderBy: input.orderBy,
    condition: input.condition
  })

/** Heterogeneous descriptors are made by typed factories and projected privately. */
export interface OAuthEligibilityDescriptor<
  N,
  Expression extends SqlExpression = SqlExpression,
  Descriptor extends object = object
> {
  readonly _tag: "OAuthEligibilityDescriptor"
  readonly scope: string
  readonly table: Descriptor
  readonly subjectId: string
  readonly credentialId: string
  readonly revision: string
  readonly condition: (subjectId: N) => Expression
  readonly decode: (row: unknown) => OAuthEligibilityFact | undefined
}

export const oauthEligibilityTable = <
  T extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
>(
  input: OAuthEligibilityTable<T, N, Expression>
): OAuthEligibilityDescriptor<N, Expression, T["table"]> => {
  const { table, subjectId, credentialId, revision, scope, condition, decode } = input

  return Object.freeze({
    _tag: "OAuthEligibilityDescriptor",
    table,
    subjectId,
    credentialId,
    revision,
    scope,
    condition,
    // The query owner supplies rows selected from this descriptor's mapped table.
    decode: (row: unknown) => decode(row as T["select"])
  })
}

export interface OAuthCleanupDescriptor<
  N,
  Expression extends SqlExpression = SqlExpression,
  Descriptor extends object = object
> {
  readonly table: Descriptor
  readonly subjectId: string
  readonly condition: OAuthCleanupTable<Table, N, Expression>["condition"]
}

export const oauthCleanupTable = <
  T extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
>(
  input: OAuthCleanupTable<T, N, Expression>
): OAuthCleanupDescriptor<N, Expression, T["table"]> =>
  Object.freeze({ table: input.table, subjectId: input.subjectId, condition: input.condition })

/** Original application binding and retained decision are encoded in snapshot. */
export interface OAuthRegistrationIntentTable<I extends Table> {
  readonly table: I["table"]
  readonly moduleId: Column<I>
  readonly reference: Column<I>
  readonly flowId: Column<I>
  readonly identityKey: Column<I>
  readonly snapshot: Column<I>
  readonly expiresAt: Column<I>
  readonly retentionUntil: Column<I>
  readonly encodeInsert: (intent: OAuthRegistrationIntent) => I["insert"]
}

export interface OAuthD1Mapping {
  readonly d1: { readonly primary: true }
}

export const requiredOAuthSignInConstraints = {
  flow: "unique(flow.moduleId,flow.flowId)",
  stateDigest: "unique(flow.stateDigest)",
  ownership: "unique(ownership.identityKey)",
  credentialId: "unique(credential.credentialId)",
  credentialIdentity: "unique(credential.identityKey)",
  authorityCredential: "unique(authority.subjectId,authority.credentialId)"
} as const

export const requiredOAuthRegistrationConstraints = {
  intentReference: "unique(intent.moduleId,intent.reference)",
  intentFlow: "unique(intent.moduleId,intent.flowId)",
  ownership: "unique(ownership.identityKey)",
  credentialId: "unique(credential.credentialId)",
  credentialIdentity: "unique(credential.identityKey)",
  authorityCredential: "unique(authority.subjectId,authority.credentialId)"
} as const

export interface OAuthSignInMapping<
  S extends Table,
  O extends Table,
  C extends Table,
  AC extends Table,
  F extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly subject: OAuthSubjectReadTable<S, Expression>
  readonly ownership: OAuthOwnershipReadTable<O, N>
  readonly credential: OAuthCredentialReadTable<C, Expression>
  readonly authority: OAuthAuthorityReadTable<AC, Expression>
  readonly flow: OAuthFlowTable<F>
  readonly subjectId: SubjectIdCodec<N>
  readonly clock: OAuthClock<Expression>
  readonly constraints: typeof requiredOAuthSignInConstraints
}

export interface OAuthRegistrationIntentMapping<
  O extends Table,
  I extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly ownership: OAuthOwnershipReadTable<O, N>
  readonly intent: OAuthRegistrationIntentTable<I>
  readonly clock: OAuthClock<Expression>
  readonly constraints: Pick<
    typeof requiredOAuthRegistrationConstraints,
    "intentReference" | "intentFlow" | "ownership"
  >
  readonly eligible: (intent: OAuthRegistrationIntent) => Expression
}

export interface OAuthRegistrationMapping<
  Registration,
  S extends Table,
  O extends Table,
  C extends Table,
  AC extends Table,
  I extends Table,
  N,
  Expression extends SqlExpression = SqlExpression,
  Descriptor extends object = object
> {
  readonly registration: Schema.Codec<Registration, unknown, never, never>
  readonly ownership: OAuthOwnershipTable<O, N>
  readonly intent: OAuthRegistrationIntentTable<I>
  readonly subject: OAuthSubjectReadTable<S, Expression>
  readonly credential: OAuthCredentialTable<C, N, Expression>
  readonly authority: OAuthAuthorityTable<AC, N, Expression>
  readonly subjectId: SubjectIdCodec<N>
  readonly clock: OAuthClock<Expression>
  readonly constraints: typeof requiredOAuthRegistrationConstraints
  readonly inspect: (input: {
    readonly intent: OAuthRegistrationIntent
    readonly registration: Registration
  }) => Effect.Effect<
    { readonly fingerprint: string; readonly eligible: boolean },
    PersistenceMappingError
  >
  readonly eligibility: {
    readonly guards?: ReadonlyArray<
      OAuthRegistrationGuardDescriptor<Registration, N, Expression, Descriptor>
    >
    readonly admission: (input: {
      readonly intent: OAuthRegistrationIntent
      readonly registration: Registration
      readonly nativeSubjectId?: N
    }) => Expression
    readonly postcondition: (input: {
      readonly intent: OAuthRegistrationIntent
      readonly registration: Registration
      readonly nativeSubjectId?: N
    }) => Expression
  }
  readonly allocateSubjectId: Effect.Effect<N, PersistenceMappingError>
  readonly allocateCredentialId: Effect.Effect<string, PersistenceMappingError>
  readonly allocateRevision: Effect.Effect<SecurityRevision, PersistenceMappingError>
  readonly encodeSubjectInsert: (
    input: {
      readonly intent: OAuthRegistrationIntent
      readonly registration: Registration
      readonly requestId: string
    },
    ids: { readonly subjectId: N; readonly securityRevision: SecurityRevision }
  ) => S["insert"]
}

export interface OAuthAccountsMapping<
  S extends Table,
  O extends Table,
  C extends Table,
  AC extends Table,
  F extends Table,
  N,
  Expression extends SqlExpression = SqlExpression,
  Descriptor extends object = object
> {
  readonly subject: OAuthSubjectTable<S, Expression>
  readonly ownership: OAuthOwnershipTable<O, N>
  readonly credential: OAuthCredentialTable<C, N, Expression>
  readonly authority: OAuthAuthorityTable<AC, N, Expression>
  readonly flow: OAuthFlowTable<F>
  readonly subjectId: SubjectIdCodec<N>
  readonly clock: OAuthClock<Expression>
  readonly constraints: typeof requiredOAuthSignInConstraints
  /** Self-contained SQL predicate rechecking this invocation's current permission
   * to view login metadata. Evaluated in every releasing read, alongside active
   * subject/credential authority and ownership. Do not trust public assurance as
   * credential provenance; bind session policy to application-owned rows as needed. */
  readonly metadataAccess: (input: {
    readonly invocation: OAuthLinkedAccountsRead["invocation"]
    readonly moduleId: string
    readonly subjectId: N
  }) => Expression
  readonly eligibility: ReadonlyArray<OAuthEligibilityDescriptor<N, Expression, Descriptor>>
  readonly cleanup: ReadonlyArray<OAuthCleanupDescriptor<N, Expression, Descriptor>>
  readonly sessionInvalidation: "same-authority-immediate" | "original-absolute-expiry"
  /** Indexed same-owner reference predicate for any installed grant/application references. */
  readonly otherReferences: (input: {
    readonly identityKey: string
    readonly subjectId: N
  }) => Expression
  readonly allocateCredentialId: Effect.Effect<string, PersistenceMappingError>
  readonly allocateRevision: Effect.Effect<SecurityRevision, PersistenceMappingError>
}

export interface OAuthRegistrationAuthority<Registration> {
  /** Only the first confirmed registration supplies its private authentication handoff. */
  readonly authentication?: "first-confirmed-registration"
  readonly read: (
    access: OAuthRegistrationAccess
  ) => Effect.Effect<OAuthRegistrationInspection | undefined, OAuthUnavailable>
  readonly inspect: (input: {
    readonly intent: OAuthRegistrationIntent
    readonly registration: Registration
  }) => Effect.Effect<
    {
      readonly fingerprint: TokenDigest
      readonly eligible: boolean
    },
    OAuthUnavailable
  >
  readonly register: <A>(
    input: {
      readonly access: OAuthRegistrationAccess
      readonly intent: OAuthRegistrationIntent
      readonly commandId: typeof OAuthCommandId.Type
      readonly registration: Registration
      readonly fingerprint: TokenDigest
      readonly payload: string
      readonly requestId: string
    },
    prepare: PrepareOAuthCommit<OAuthRegistrationDecision, A>
  ) => Effect.Effect<PreparedCommit<A>, OAuthUnavailable>
  readonly cleanup: <A>(
    input: OAuthCleanupInput,
    prepare: PrepareOAuthCommit<CleanupResult, A>
  ) => Effect.Effect<PreparedCommit<A>, OAuthUnavailable>
}
