import type { TokenDigest } from "@effect/auth/Schema"
import type {
  AuthenticationFlowId,
  AuthenticationRequirement,
  PendingAuthenticationRecord,
  SecurityRevision,
  SessionId,
  StatefulSessionRecord
} from "@effect/auth/Sessions"
import type * as DateTime from "effect/DateTime"
import type * as Effect from "effect/Effect"

import type { SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { PersistenceMappingError, SubjectIdCodec } from "./common.ts"
import type { ProofClock } from "./proofModel.ts"

type ColumnKey<T extends Table> = T["column"]

export interface SessionIdCodec<NativeId> {
  readonly toNative: (id: SessionId) => Effect.Effect<NativeId, PersistenceMappingError>
  readonly toSession: (id: NativeId) => Effect.Effect<SessionId, PersistenceMappingError>
  readonly equals: (left: NativeId, right: NativeId) => boolean
}

export interface SessionSubjectTables<Subject extends Table, NativeId> {
  readonly subject: {
    readonly table: Subject["table"]
    readonly id: ColumnKey<Subject>
    readonly status: ColumnKey<Subject>
    readonly securityRevision: ColumnKey<Subject>
    readonly activeStatusValue: unknown
    readonly isActiveStatus: (value: unknown) => boolean
    readonly decodeRequirement: (
      row: Subject["select"]
    ) => Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
    /** Required for D1 authority writes. Declare every mutable subject input of
     * decodeRequirement; [] explicitly declares a constant requirement. */
    readonly requirementColumns?: ReadonlyArray<ColumnKey<Subject>>
    readonly nextSecurityRevision?: (
      current: SecurityRevision
    ) => Effect.Effect<SecurityRevision, PersistenceMappingError>
    readonly nextSecurityRevisionSync?: (current: SecurityRevision) => SecurityRevision
  }
  readonly subjectId: SubjectIdCodec<NativeId>
}

export interface SessionAuthorityTables<
  Subject extends Table,
  Credential extends Table,
  NativeId
> extends SessionSubjectTables<Subject, NativeId> {
  readonly credential: {
    readonly table: Credential["table"]
    readonly subjectId: ColumnKey<Credential>
    readonly credentialId: ColumnKey<Credential>
    readonly revision: ColumnKey<Credential>
    /** Omitted status means every row is an active credential. */
    readonly status?: ColumnKey<Credential>
    readonly activeStatusValue?: unknown
    readonly isActiveStatus?: (value: unknown) => boolean
  }
}

export interface SessionExecution<Expression extends SqlExpression = SqlExpression> {
  /** Exact session module scope for pending rows and revocation tombstones. */
  readonly moduleId: string
  readonly clock: ProofClock<Expression>
  /** D1 mappings must use the authoritative primary database. */
  readonly d1?: { readonly primary: true }
  /** Match only the declared unique keys, never generic SQL failures. */
  readonly isConstraintConflict: (cause: unknown) => boolean
}

export interface StatefulSessionTables<
  Claims,
  Session extends Table,
  NativeSubjectId,
  NativeSessionId
> {
  readonly session: {
    readonly table: Session["table"]
    readonly sessionId: ColumnKey<Session>
    readonly subjectId: ColumnKey<Session>
    readonly digest: ColumnKey<Session>
    readonly securityRevision: ColumnKey<Session>
    readonly issuedAt: ColumnKey<Session>
    readonly expiresAt: ColumnKey<Session>
    readonly absoluteExpiresAt: ColumnKey<Session>
    readonly encodeInstant: (instant: DateTime.Utc) => unknown
    readonly encodeInsert: (
      record: StatefulSessionRecord<Claims>,
      ids: { readonly subjectId: NativeSubjectId; readonly sessionId: NativeSessionId }
    ) => Session["insert"]
    /** Replace prepared metadata and retain exact private provenance. Digest binds the immutable source metadata. */
    readonly encodeRotation: (record: StatefulSessionRecord<Claims>) => Partial<Session["insert"]>
    readonly decode: (
      row: Session["select"]
    ) => Effect.Effect<StatefulSessionRecord<Claims>, PersistenceMappingError>
    readonly allocateId?: Effect.Effect<NativeSessionId, PersistenceMappingError>
    readonly allocateIdSync?: () => NativeSessionId
  }
  readonly sessionId: SessionIdCodec<NativeSessionId>
}

export interface SessionPendingInsert<NativeId> {
  readonly moduleId: string
  readonly kind: "Login" | "StepUp"
  readonly digest: TokenDigest
  readonly version: SecurityRevision
  readonly flowId: AuthenticationFlowId
  readonly subjectId: NativeId
  readonly bindingDigest: TokenDigest
  readonly snapshot: string
  readonly expiresAt: DateTime.Utc
  readonly attemptLimit: number
}

/** One physical table and one SQL owner for Login and StepUp. The adapter sets
 * every guard column and binds kind before decoding, charging or consuming. */
export interface SessionPendingTables<Pending extends Table, NativeSubjectId> {
  readonly pending: {
    readonly table: Pending["table"]
    readonly moduleId: ColumnKey<Pending>
    readonly kind: ColumnKey<Pending>
    readonly digest: ColumnKey<Pending>
    readonly version: ColumnKey<Pending>
    readonly flowId: ColumnKey<Pending>
    readonly subjectId: ColumnKey<Pending>
    readonly bindingDigest: ColumnKey<Pending>
    readonly snapshot: ColumnKey<Pending>
    readonly expiresAt: ColumnKey<Pending>
    readonly attemptLimit: ColumnKey<Pending>
    readonly failedAttempts: ColumnKey<Pending>
    readonly consumed: ColumnKey<Pending>
    readonly encodeInstant: (instant: DateTime.Utc) => unknown
    readonly encodeInsert: (input: SessionPendingInsert<NativeSubjectId>) => Pending["insert"]
    readonly allocateVersion?: Effect.Effect<SecurityRevision, PersistenceMappingError>
    readonly allocateVersionSync?: () => SecurityRevision
  }
}

export interface PendingAuthenticationTables<
  Claims,
  Pending extends Table,
  NativeSubjectId
> extends SessionPendingTables<Pending, NativeSubjectId> {
  /** Canonical JSON of the full record; the consumer Schema owns Claims encoding. */
  readonly login: {
    readonly encode: (
      record: PendingAuthenticationRecord<Claims>
    ) => Effect.Effect<string, PersistenceMappingError>
    readonly decode: (
      snapshot: unknown
    ) => Effect.Effect<PendingAuthenticationRecord<Claims>, PersistenceMappingError>
  }
}

export interface SignedSessionValidityTables<
  Tombstone extends Table,
  NativeSubjectId,
  NativeSessionId
> {
  readonly tombstone: {
    readonly table: Tombstone["table"]
    readonly moduleId: ColumnKey<Tombstone>
    readonly subjectId: ColumnKey<Tombstone>
    readonly sessionId: ColumnKey<Tombstone>
    readonly absoluteExpiresAt: ColumnKey<Tombstone>
    readonly encodeInstant: (instant: DateTime.Utc) => unknown
    readonly decodeInstant: (
      native: unknown
    ) => Effect.Effect<DateTime.Utc, PersistenceMappingError>
    readonly encodeInsert: (input: {
      readonly moduleId: string
      readonly subjectId: NativeSubjectId
      readonly sessionId: NativeSessionId
      readonly absoluteExpiresAt: DateTime.Utc
    }) => Tombstone["insert"]
  }
  readonly sessionId: SessionIdCodec<NativeSessionId>
}

export const requiredSessionConstraints = { sessionDigest: "unique(session.digest)" } as const

export const requiredPendingAuthenticationConstraints = {
  pendingDigest: "unique(pending.digest)"
} as const

export const requiredStatefulPendingConstraints = {
  ...requiredSessionConstraints,
  ...requiredPendingAuthenticationConstraints
} as const

export const requiredSignedValidityConstraints = {
  tombstoneOwner: "unique(tombstone.moduleId,tombstone.subjectId,tombstone.sessionId)"
} as const

export type RequiredSessionConstraints = typeof requiredSessionConstraints

export type RequiredPendingAuthenticationConstraints = typeof requiredPendingAuthenticationConstraints

export type RequiredStatefulPendingConstraints = typeof requiredStatefulPendingConstraints
export type RequiredSignedValidityConstraints = typeof requiredSignedValidityConstraints

export type AuthenticationAuthorityMapping<
  Claims,
  Subject extends Table,
  Credential extends Table,
  Pending extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> =
  & SessionAuthorityTables<Subject, Credential, NativeSubjectId>
  & SessionExecution<Expression>
  & (
    | { readonly pending?: undefined }
    | {
      readonly pending: PendingAuthenticationTables<Claims, Pending, NativeSubjectId>
      readonly constraints: RequiredPendingAuthenticationConstraints
    }
  )

export type StatefulSessionMapping<
  Claims,
  Subject extends Table,
  Credential extends Table,
  Session extends Table,
  Pending extends Table,
  NativeSubjectId,
  NativeSessionId,
  Expression extends SqlExpression = SqlExpression
> =
  & SessionAuthorityTables<Subject, Credential, NativeSubjectId>
  & StatefulSessionTables<Claims, Session, NativeSubjectId, NativeSessionId>
  & SessionExecution<Expression>
  & (
    | { readonly pending?: undefined; readonly constraints: RequiredSessionConstraints }
    | {
      readonly pending: PendingAuthenticationTables<Claims, Pending, NativeSubjectId>
      readonly constraints: RequiredStatefulPendingConstraints
    }
  )

export type PendingAuthenticationMapping<
  Claims,
  Subject extends Table,
  Credential extends Table,
  Pending extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> =
  & SessionAuthorityTables<Subject, Credential, NativeSubjectId>
  & PendingAuthenticationTables<Claims, Pending, NativeSubjectId>
  & SessionExecution<Expression>
  & { readonly constraints: RequiredPendingAuthenticationConstraints }

export type SignedSessionValidityMapping<
  Subject extends Table,
  Tombstone extends Table,
  NativeSubjectId,
  NativeSessionId,
  Expression extends SqlExpression = SqlExpression
> =
  & SessionSubjectTables<Subject, NativeSubjectId>
  & SignedSessionValidityTables<Tombstone, NativeSubjectId, NativeSessionId>
  & SessionExecution<Expression>
  & { readonly constraints: RequiredSignedValidityConstraints }

/** Maintenance uses the same mapped rows and one total per-call deletion limit. */
export type SessionCleanupMapping<
  Pending extends Table,
  Tombstone extends Table,
  NativeSubjectId,
  NativeSessionId,
  Expression extends SqlExpression = SqlExpression
> = Pick<SessionExecution<Expression>, "moduleId" | "clock" | "d1"> & {
  readonly pending?: SessionPendingTables<Pending, NativeSubjectId>["pending"]
  readonly tombstone?: SignedSessionValidityTables<
    Tombstone,
    NativeSubjectId,
    NativeSessionId
  >["tombstone"]
}
