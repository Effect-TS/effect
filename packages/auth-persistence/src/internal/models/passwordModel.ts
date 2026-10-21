import type { LoginIdentifier } from "@effect/auth/Identity"
import type {
  EncodedPasswordHash,
  PasswordAction,
  PasswordCredentialSnapshot,
  PasswordReplacement
} from "@effect/auth/Password"
import type { AuthenticationRequirement, SecurityRevision } from "@effect/auth/Sessions"
import type * as Effect from "effect/Effect"
import type * as Redacted from "effect/Redacted"

import type { AnyTableModel, SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { PersistenceMappingError, SubjectIdCodec } from "./common.ts"
import type { ProofClock } from "./proofModel.ts"

type ColumnKey<T extends Table> = T["column"]

export interface PasswordSubjectTable<Subject extends Table, _NativeSubjectId> {
  readonly table: Subject["table"]
  readonly id: ColumnKey<Subject>
  readonly status: ColumnKey<Subject>
  readonly securityRevision: ColumnKey<Subject>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly decodeRequirement: (
    row: Subject["select"]
  ) => Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
  /** Current policy for this exact credential mutation. Interactive drivers hold
   * the subject lock; D1 guards the physical application columns through commit. */
  readonly decodeActionRequirement: (
    row: Subject["select"],
    action: PasswordAction
  ) => Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
  readonly nextSecurityRevision?: (
    current: SecurityRevision
  ) => Effect.Effect<SecurityRevision, PersistenceMappingError>
  readonly nextSecurityRevisionSync?: (current: SecurityRevision) => SecurityRevision
  /** Required only by D1 conditional statements. */
  readonly d1ActiveStatusValue?: unknown
}

export interface PasswordIdentifierTable<
  Identifier extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: Identifier["table"]
  readonly namespace: ColumnKey<Identifier>
  readonly value: ColumnKey<Identifier>
  readonly subjectId: ColumnKey<Identifier>
  readonly verifiedAt: ColumnKey<Identifier>
  readonly bindingRevision: ColumnKey<Identifier>
  /** Consumer-owned current login/recovery eligibility, including row status. */
  readonly isCurrent: (row: Identifier["select"]) => boolean
  /** Required by D1 so current ownership/eligibility is rechecked in the batch. */
  readonly d1CurrentCondition?: (input: {
    readonly identifier: LoginIdentifier
    readonly nativeSubjectId: NativeSubjectId
  }) => Expression
  readonly encodeInitialInsert: (
    identifier: LoginIdentifier,
    subjectId: NativeSubjectId,
    bindingRevision: SecurityRevision
  ) => Identifier["insert"]
}

export interface PasswordAuthorityCredentialTable<Credential extends Table, NativeSubjectId> {
  readonly table: Credential["table"]
  readonly subjectId: ColumnKey<Credential>
  readonly credentialId: ColumnKey<Credential>
  readonly revision: ColumnKey<Credential>
  readonly status?: ColumnKey<Credential>
  readonly isActiveStatus?: (value: unknown) => boolean
  readonly d1ActiveStatusValue?: unknown
  readonly encodeInsert: (input: {
    readonly subjectId: NativeSubjectId
    readonly credentialId: string
    readonly revision: SecurityRevision
  }) => Credential["insert"]
  readonly encodeRevision: (revision: SecurityRevision) => Partial<Credential["insert"]>
}

export interface PasswordCredentialTable<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  NativeSubjectId
> {
  readonly table: Credential["table"]
  readonly moduleId: ColumnKey<Credential>
  readonly subjectId: ColumnKey<Credential>
  readonly credentialId: ColumnKey<Credential>
  readonly credentialRevision: ColumnKey<Credential>
  readonly verifierVersion: ColumnKey<Credential>
  readonly verifier: ColumnKey<Credential>
  readonly normalization: ColumnKey<Credential>
  readonly encodeInsert: (input: {
    readonly moduleId: string
    readonly subjectId: NativeSubjectId
    readonly credentialId: string
    readonly credentialRevision: SecurityRevision
    readonly verifierVersion: SecurityRevision
    readonly replacement: PasswordReplacement
  }) => Credential["insert"]
  readonly encodeVerifier: (
    verifier: Redacted.Redacted<EncodedPasswordHash>,
    verifierVersion: SecurityRevision
  ) => Partial<Credential["insert"]>
  readonly encodeReplacement: (input: {
    readonly replacement: PasswordReplacement
    readonly credentialRevision: SecurityRevision
    readonly verifierVersion: SecurityRevision
  }) => Partial<Credential["insert"]>
  readonly decode: (input: {
    readonly moduleId: string
    readonly subject: Subject["select"]
    readonly identifier: Identifier["select"]
    readonly credential: Credential["select"]
  }) => Effect.Effect<PasswordCredentialSnapshot, PersistenceMappingError>
}

export interface RequiredPasswordConstraints {
  readonly identifier: "unique(identifier.namespace,identifier.value)"
  readonly authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)"
  readonly credentialSubject: "unique(credential.moduleId,credential.subjectId)"
  readonly credentialId: "unique(credential.moduleId,credential.credentialId)"
}

export const requiredPasswordConstraints: RequiredPasswordConstraints = {
  identifier: "unique(identifier.namespace,identifier.value)",
  authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)",
  credentialSubject: "unique(credential.moduleId,credential.subjectId)",
  credentialId: "unique(credential.moduleId,credential.credentialId)"
}

export interface PasswordPersistenceMapping<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> {
  readonly subject: PasswordSubjectTable<Subject, NativeSubjectId>
  readonly identifier: PasswordIdentifierTable<Identifier, NativeSubjectId, Expression>
  readonly credential: PasswordCredentialTable<Subject, Identifier, Credential, NativeSubjectId>
  /** Every factor revision named by action evidence, including non-password factors. */
  readonly authorityCredential: PasswordAuthorityCredentialTable<
    AuthorityCredential,
    NativeSubjectId
  >
  readonly subjectId: SubjectIdCodec<NativeSubjectId>
  readonly constraints: RequiredPasswordConstraints
  readonly encodeInstant: (epochMillis: number) => unknown
  readonly decodeInstant: (native: unknown) => Effect.Effect<number, PersistenceMappingError>
  readonly allocateCredentialId?: Effect.Effect<string, PersistenceMappingError>
  readonly allocateCredentialIdSync?: () => string
  readonly allocateRevision?: Effect.Effect<SecurityRevision, PersistenceMappingError>
  readonly allocateRevisionSync?: () => SecurityRevision
  /** All semantic replacements still bump subject revision. This flag declares
   * authoritative verification's invalidation latency; cookie exposure is separate. */
  readonly sessionInvalidation: "same-authority-immediate" | "original-absolute-expiry"
  readonly clock: ProofClock<Expression>
  readonly d1?: { readonly primary: true }
}

export interface PasswordRegistrationIntent<Registration> {
  readonly moduleId: string
  readonly requestId: string
  readonly identifier: LoginIdentifier
  readonly registration: Registration
  readonly replacement: PasswordReplacement
}

export interface PasswordRegistrationProvisioning<
  Registration,
  Subject extends Table,
  NativeSubjectId
> {
  readonly encodeSubjectInsert: (
    input: PasswordRegistrationIntent<Registration>,
    values: {
      readonly nativeSubjectId: NativeSubjectId | undefined
      readonly securityRevision: SecurityRevision
    }
  ) => Subject["insert"]
  readonly allocateSubjectId?: Effect.Effect<NativeSubjectId, PersistenceMappingError>
  readonly allocateSubjectIdSync?: () => NativeSubjectId
  /** Interactive targets use this for database-generated/autoincrement keys. */
  readonly decodeGeneratedId?: (
    rows: ReadonlyArray<unknown>
  ) => Effect.Effect<NativeSubjectId, PersistenceMappingError>
}

export interface RequiredPasswordRegistrationConstraints {
  readonly identifier: "unique(identifier.namespace,identifier.value)"
  readonly credentialSubject: "unique(credential.moduleId,credential.subjectId)"
  readonly authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)"
}

export const requiredPasswordRegistrationConstraints: RequiredPasswordRegistrationConstraints = {
  identifier: "unique(identifier.namespace,identifier.value)",
  credentialSubject: "unique(credential.moduleId,credential.subjectId)",
  authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)"
}

export interface PasswordRegistrationConstraintClassifier {
  readonly isIdentifierConflict: (cause: unknown) => boolean
  readonly isCredentialConflict: (cause: unknown) => boolean
}

export type PasswordRegistrationMapping<
  Registration,
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> = PasswordRegistrationConstraintClassifier & {
  readonly subject: PasswordSubjectTable<Subject, NativeSubjectId>
  readonly identifier: PasswordIdentifierTable<Identifier, NativeSubjectId, Expression>
  readonly credential: PasswordCredentialTable<Subject, Identifier, Credential, NativeSubjectId>
  readonly authorityCredential: PasswordAuthorityCredentialTable<
    AuthorityCredential,
    NativeSubjectId
  >
  readonly subjectId: SubjectIdCodec<NativeSubjectId>
  readonly constraints: RequiredPasswordRegistrationConstraints
  readonly allocateCredentialId?: Effect.Effect<string, PersistenceMappingError>
  readonly allocateCredentialIdSync?: () => string
  readonly allocateRevision?: Effect.Effect<SecurityRevision, PersistenceMappingError>
  readonly allocateRevisionSync?: () => SecurityRevision
} & {
  readonly mode: "atomic"
  readonly provisioning:
    & PasswordRegistrationProvisioning<Registration, Subject, NativeSubjectId>
    & (
      | {
        readonly idMode: "allocated"
        readonly allocateSubjectId: Effect.Effect<NativeSubjectId, PersistenceMappingError>
      }
      | {
        readonly idMode: "synchronous"
        readonly allocateSubjectIdSync: () => NativeSubjectId
      }
      | {
        readonly idMode: "generated"
        readonly decodeGeneratedId: (
          rows: ReadonlyArray<unknown>
        ) => Effect.Effect<NativeSubjectId, PersistenceMappingError>
      }
    )
}

export type AnyPasswordPersistenceMapping<Expression extends SqlExpression = SqlExpression> =
  PasswordPersistenceMapping<
    AnyTableModel,
    AnyTableModel,
    AnyTableModel,
    AnyTableModel,
    unknown,
    Expression
  >

export type AnyPasswordRegistrationMapping<
  Registration = unknown,
  Expression extends SqlExpression = SqlExpression
> = PasswordRegistrationMapping<
  Registration,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  unknown,
  Expression
>
