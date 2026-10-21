import type { PreparedCommit } from "@effect/auth/Hooks"
import type {
  PasskeyAccess,
  PasskeyActionAuthorization,
  PasskeyCeremony,
  PasskeyCredential,
  PasskeyCredentialSummary,
  PasskeyIssueDecision,
  PasskeyManagementPersistence,
  PasskeyManagementPolicy,
  PasskeyRegistrationResult,
  PasskeyRegistrationVerified,
  PasskeyRequirement,
  PasskeyRevision,
  PasskeyUnavailable,
  PreparePasskeyCommit
} from "@effect/auth/Passkey"
import type { TokenDigest } from "@effect/auth/Schema"
import type { SessionInvalidationWindow } from "@effect/auth/Sessions"
import type * as Effect from "effect/Effect"
import type * as Schema from "effect/Schema"

import type { SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { PersistenceMappingError } from "./common.ts"
import type {
  PasskeyColumn,
  PasskeyCredentialMapping,
  PasskeyFlowTable,
  PasskeyPersistenceMapping,
  PasskeyPersistenceServices
} from "./passkeyModel.ts"

export interface PasskeyCredentialInsert<N> {
  readonly subjectId: N
  readonly credential: PasskeyCredential
  readonly summary: PasskeyCredentialSummary
  readonly marker: string
}

export interface PasskeyWriteTables<
  S extends Table,
  C extends Table,
  F extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> {
  readonly credential: {
    readonly name: PasskeyColumn<C>
    readonly createdAt: PasskeyColumn<C>
    readonly encodeInsert: (input: PasskeyCredentialInsert<N>) => C["insert"]
    readonly encodePrimarySignIn: (value: boolean) => unknown
    readonly encodeEnrollmentUserVerified: (value: boolean) => unknown
    readonly encodeBackupEligible: (value: boolean) => unknown
    readonly activeStatus: unknown
    readonly removedStatus: unknown
  }
  readonly authority: {
    readonly encodeInsert: (input: PasskeyCredentialInsert<N>) => F["insert"]
    readonly activeStatus: unknown
    readonly removedStatus: unknown
  }
  /** Mutable management policy dependencies belong to the locked subject row. */
  readonly policy: {
    readonly subjectColumns: ReadonlyArray<PasskeyColumn<S>>
    readonly management: (row: Readonly<Partial<S["select"]>>) => PasskeyManagementPolicy
    readonly requirement: (
      row: Readonly<Partial<S["select"]>>,
      action: PasskeyActionAuthorization["challenge"]["action"]
    ) => Effect.Effect<typeof PasskeyRequirement.Type, PersistenceMappingError>
    readonly metadata: (subjectId: N) => Expression
    readonly action: (subjectId: N, authorization: PasskeyActionAuthorization) => Expression
    /** Usable primary/recovery path AND required remaining factors. Evaluated with the target excluded, before and after removal. Connected grants/factor-only credentials are not primary paths. */
    readonly remainingSignIn: (
      subjectId: N,
      removedCredentialId: string,
      row: Readonly<Partial<S["select"]>>
    ) => Effect.Effect<Expression, PersistenceMappingError>
  }
}

export interface PasskeyInvalidationInput<N> {
  readonly subjectId: N
  readonly previousRevision: typeof PasskeyRevision.Type.securityRevision
  readonly securityRevision: typeof PasskeyRevision.Type.securityRevision
  readonly invalidation: SessionInvalidationWindow
}

export interface PasskeyInvalidationMutation<N, Expression extends SqlExpression = SqlExpression> {
  readonly table: object
  readonly where: (input: PasskeyInvalidationInput<N>) => Expression
  readonly values: (input: PasskeyInvalidationInput<N>) => Readonly<Record<string, unknown>>
  readonly postcondition: (input: PasskeyInvalidationInput<N>) => Expression
}

/** Same-owner updates for consumer session/pending tables. No external effects or callbacks after commit. */
export const passkeyInvalidationMutation = <
  T extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
>(input: {
  readonly table: T["table"]
  readonly where: (input: PasskeyInvalidationInput<N>) => Expression
  readonly values: (input: PasskeyInvalidationInput<N>) => Partial<T["insert"]>
  readonly postcondition: (input: PasskeyInvalidationInput<N>) => Expression
}): PasskeyInvalidationMutation<N, Expression> => input

export interface PasskeyManagementMapping<
  S extends Table,
  C extends Table,
  F extends Table,
  Flow extends Table,
  N,
  Expression extends SqlExpression = SqlExpression
> extends
  PasskeyPersistenceMapping<
    PasskeyCredentialMapping<S, C, F, N, Expression>,
    Flow,
    N,
    Expression,
    C
  >
{
  readonly write: PasskeyWriteTables<S, C, F, N, Expression>
  /** Removal must match the installed session strategy and change the subject revision; immediate sessions must consult that authority or be updated here. Enrollment preserves existing authentication. */
  readonly invalidation: {
    readonly window: SessionInvalidationWindow
    readonly mutations: ReadonlyArray<PasskeyInvalidationMutation<N, Expression>>
    readonly postcondition: (input: PasskeyInvalidationInput<N>) => Expression
  }
}

export interface PasskeyManagementServices extends PasskeyPersistenceServices {
  readonly passkeyManagementPersistence: PasskeyManagementPersistence["Service"]
}

export interface PasskeyRegistrationWriter<R> {
  readonly inspect: (registration: R) => Effect.Effect<
    {
      readonly fingerprint: TokenDigest
      readonly eligible: boolean
      readonly name: string
      readonly displayName: string
    },
    PasskeyUnavailable
  >
  readonly issueRegistration: <A>(
    input: {
      readonly ceremony: PasskeyCeremony
      readonly registration: R
    },
    prepare: PreparePasskeyCommit<PasskeyIssueDecision, A>
  ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
  readonly completeRegistration: <A>(
    input: {
      readonly access: PasskeyAccess
      readonly ceremony: PasskeyCeremony
      readonly verified: PasskeyRegistrationVerified
    },
    prepare: PreparePasskeyCommit<
      | PasskeyRegistrationResult
      | {
        readonly _tag: "Rejected"
      },
      A
    >
  ) => Effect.Effect<PreparedCommit<A>, PasskeyUnavailable>
}

export interface PasskeyRegistrationServices<R> extends PasskeyPersistenceServices {
  readonly passkeyRegistrationAuthority: PasskeyRegistrationWriter<R>
}

export interface PasskeyRegistrationMapping<
  S extends Table,
  C extends Table,
  F extends Table,
  Flow extends Table,
  N,
  R,
  Expression extends SqlExpression = SqlExpression
> extends
  PasskeyPersistenceMapping<
    PasskeyCredentialMapping<S, C, F, N, Expression>,
    Flow,
    N,
    Expression,
    C
  >
{
  readonly write: PasskeyWriteTables<S, C, F, N, Expression>
  readonly flow: PasskeyFlowTable<Flow>
  /** Schema-encoded original registration payload on the same immutable flow row. */
  readonly applicationSnapshot: PasskeyColumn<Flow>
  /** Consumer-owned data and identity, synchronously encoded inside the owner. A SQL-local registration creates no session and needs no email address. */
  readonly registration: {
    readonly schema: Schema.Codec<R, unknown, never, never>
    readonly describe: (registration: R) => {
      readonly name: string
      readonly displayName: string
    }
    readonly eligible: (registration: R) => Expression
    /** Commit-time application policy after provisioning. Unlike `eligible`, this
     * must permit the newly created subject and retain every mutable prerequisite.
     * Subject-local prerequisites are checked under its lock. */
    readonly finalEligibility: (input: {
      readonly registration: R
      readonly subjectId: N
    }) => Expression
    /** D1 plans require explicit subject identity, status, and security revision
     * values; they cannot read database defaults before the atomic batch runs. */
    readonly subject: (input: {
      readonly registration: R
      readonly ceremony: PasskeyCeremony
      readonly marker: string
    }) => {
      readonly subjectId: N
      readonly values: S["insert"]
    }
    readonly activeStatus: unknown
  }
}
