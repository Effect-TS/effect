import type { EmailAction, EmailCredentialSnapshot } from "@effect/auth/Email"
import type { LoginIdentifier } from "@effect/auth/Identity"
import type { ProofRedemptionInput } from "@effect/auth/Proofs"
import type { TokenDigest } from "@effect/auth/Schema"
import type { AuthenticationRequirement, SecurityRevision } from "@effect/auth/Sessions"
import type * as Effect from "effect/Effect"

import type { AnyTableModel, SqlExpression, TableModel as Table } from "../tableModel.ts"
import type { PersistenceMappingError, SubjectIdCodec } from "./common.ts"
import type { ProofClock } from "./proofModel.ts"

type ColumnKey<T extends Table> = T["column"]

export interface EmailSubjectReadTable<Subject extends Table> {
  readonly table: Subject["table"]
  readonly id: ColumnKey<Subject>
  readonly status: ColumnKey<Subject>
  readonly securityRevision: ColumnKey<Subject>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeStatusValue: unknown
  readonly decodeRequirement: (
    row: Subject["select"]
  ) => Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
}

export interface EmailSubjectTable<Subject extends Table> extends EmailSubjectReadTable<Subject> {
  readonly decodeActionRequirement: (
    row: Subject["select"],
    action: EmailAction
  ) => Effect.Effect<AuthenticationRequirement, PersistenceMappingError>
  readonly nextSecurityRevision?: (
    current: SecurityRevision
  ) => Effect.Effect<SecurityRevision, PersistenceMappingError>
  readonly nextSecurityRevisionSync?: (current: SecurityRevision) => SecurityRevision
  readonly activeStatusValue: unknown
}

export interface EmailIdentifierReadTable<Identifier extends Table> {
  readonly table: Identifier["table"]
  readonly namespace: ColumnKey<Identifier>
  readonly value: ColumnKey<Identifier>
  readonly subjectId: ColumnKey<Identifier>
  readonly verifiedAt: ColumnKey<Identifier>
  readonly bindingRevision: ColumnKey<Identifier>
  readonly isCurrent: (row: Identifier["select"]) => boolean
}

export interface EmailIdentifierTable<
  Identifier extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> extends EmailIdentifierReadTable<Identifier> {
  /** True only for an active, unverified binding. Confirming it preserves existing sessions. */
  readonly isMutableTarget: (row: Identifier["select"]) => boolean
  readonly encodeVerifiedInsert: (input: {
    readonly identifier: LoginIdentifier
    readonly subjectId: NativeSubjectId
    readonly verifiedAtMillis: number
    readonly bindingRevision: SecurityRevision
  }) => Identifier["insert"]
  readonly encodeVerification: (input: {
    readonly verifiedAtMillis: number
    readonly bindingRevision: SecurityRevision
  }) => Partial<Identifier["insert"]>
  /** Must make the selected source unavailable to sign-in. */
  readonly encodeRetirement: (input: {
    readonly source: LoginIdentifier
    readonly bindingRevision: SecurityRevision
  }) => Partial<Identifier["insert"]>
  readonly d1CurrentCondition?: (input: {
    readonly identifier: LoginIdentifier
    readonly nativeSubjectId: NativeSubjectId
    readonly bindingRevision: SecurityRevision
  }) => Expression
  readonly d1MutableTargetCondition?: (input: {
    readonly identifier: LoginIdentifier
    readonly nativeSubjectId: NativeSubjectId
  }) => Expression
}

export interface EmailCredentialReadTable<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  _NativeSubjectId
> {
  readonly table: Credential["table"]
  readonly moduleId: ColumnKey<Credential>
  readonly subjectId: ColumnKey<Credential>
  readonly credentialId: ColumnKey<Credential>
  readonly identifierNamespace: ColumnKey<Credential>
  readonly identifierValue: ColumnKey<Credential>
  readonly credentialRevision: ColumnKey<Credential>
  readonly status: ColumnKey<Credential>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeStatusValue: unknown
  readonly decode: (input: {
    readonly moduleId: string
    readonly subject: Subject["select"]
    readonly identifier: Identifier["select"]
    readonly credential: Credential["select"]
  }) => Effect.Effect<
    Omit<EmailCredentialSnapshot, "requirement">,
    PersistenceMappingError
  >
}

export interface EmailCredentialTable<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  NativeSubjectId
> extends EmailCredentialReadTable<Subject, Identifier, Credential, NativeSubjectId> {
  readonly encodeVerifiedInsert: (input: {
    readonly moduleId: string
    readonly subjectId: NativeSubjectId
    readonly credentialId: string
    readonly identifier: LoginIdentifier
    readonly credentialRevision: SecurityRevision
  }) => Credential["insert"]
  readonly encodeActivation: (input: {
    readonly identifier: LoginIdentifier
    readonly credentialRevision: SecurityRevision
  }) => Partial<Credential["insert"]>
  readonly encodeRetirement: (input: {
    readonly source: LoginIdentifier
    readonly credentialRevision: SecurityRevision
  }) => Partial<Credential["insert"]>
  readonly activeStatusValue: unknown
}

export interface EmailAuthorityCredentialTable<Credential extends Table, NativeSubjectId> {
  readonly table: Credential["table"]
  readonly subjectId: ColumnKey<Credential>
  readonly credentialId: ColumnKey<Credential>
  readonly revision: ColumnKey<Credential>
  readonly status: ColumnKey<Credential>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly encodeInsert: (input: {
    readonly subjectId: NativeSubjectId
    readonly credentialId: string
    readonly revision: SecurityRevision
  }) => Credential["insert"]
  readonly encodeActivation: (revision: SecurityRevision) => Partial<Credential["insert"]>
  readonly encodeRetirement: (revision: SecurityRevision) => Partial<Credential["insert"]>
  readonly activeStatusValue: unknown
}

export interface RequiredEmailSignInConstraints {
  readonly authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)"
  readonly identifier: "unique(identifier.namespace,identifier.value)"
  readonly credentialId: "unique(emailCredential.moduleId,emailCredential.credentialId)"
  readonly credentialIdentifier:
    "unique(emailCredential.moduleId,emailCredential.identifierNamespace,emailCredential.identifierValue)"
}

export const requiredEmailSignInConstraints: RequiredEmailSignInConstraints = {
  authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)",
  identifier: "unique(identifier.namespace,identifier.value)",
  credentialId: "unique(emailCredential.moduleId,emailCredential.credentialId)",
  credentialIdentifier:
    "unique(emailCredential.moduleId,emailCredential.identifierNamespace,emailCredential.identifierValue)"
}

export interface EmailSignInMapping<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId
> {
  readonly subject: EmailSubjectReadTable<Subject>
  readonly identifier: EmailIdentifierReadTable<Identifier>
  readonly credential: EmailCredentialReadTable<Subject, Identifier, Credential, NativeSubjectId>
  readonly authorityCredential: EmailAuthorityCredentialTable<AuthorityCredential, NativeSubjectId>
  readonly subjectId: SubjectIdCodec<NativeSubjectId>
  readonly constraints: RequiredEmailSignInConstraints
  readonly decodeInstant: (native: unknown) => Effect.Effect<number, PersistenceMappingError>
}

export interface RequiredEmailAddressConstraints extends RequiredEmailSignInConstraints {
  readonly authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)"
}

export const requiredEmailAddressConstraints: RequiredEmailAddressConstraints = {
  ...requiredEmailSignInConstraints,
  authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)"
}

export interface EmailAddressMapping<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> extends
  EmailSignInMapping<
    Subject,
    Identifier,
    Credential,
    AuthorityCredential,
    NativeSubjectId
  >
{
  readonly subject: EmailSubjectTable<Subject>
  readonly identifier: EmailIdentifierTable<Identifier, NativeSubjectId, Expression>
  readonly credential: EmailCredentialTable<Subject, Identifier, Credential, NativeSubjectId>
  readonly authorityCredential: EmailAuthorityCredentialTable<AuthorityCredential, NativeSubjectId>
  readonly constraints: RequiredEmailAddressConstraints
  readonly addressCardinality: "single" | "multiple"
  readonly changeDisposition: "retire-source"
  readonly allocateCredentialId?: Effect.Effect<string, PersistenceMappingError>
  readonly allocateCredentialIdSync?: () => string
  readonly allocateRevision?: Effect.Effect<SecurityRevision, PersistenceMappingError>
  readonly allocateRevisionSync?: () => SecurityRevision
  readonly encodeInstant: (epochMillis: number) => unknown
  readonly sessionInvalidation: "same-authority-immediate" | "original-absolute-expiry"
  readonly isIdentifierConflict: (cause: unknown) => boolean
  readonly isCredentialConflict: (cause: unknown) => boolean
  readonly clock: ProofClock<Expression>
  readonly d1?: { readonly primary: true }
}

export interface EmailRegistrationIntent<Registration> {
  readonly moduleId: string
  readonly commandId: string
  readonly identifier: LoginIdentifier
  readonly registration: Registration
  readonly requestId: string
  readonly fingerprint: TokenDigest
  readonly redemption: ProofRedemptionInput
}

export interface EmailRegistrationProvisioning<
  Registration,
  Subject extends Table,
  NativeSubjectId
> {
  readonly encodeSubjectInsert: (
    input: EmailRegistrationIntent<Registration>,
    values: {
      readonly nativeSubjectId: NativeSubjectId | undefined
      readonly securityRevision: SecurityRevision
    }
  ) => Subject["insert"]
  readonly allocateSubjectId?: Effect.Effect<NativeSubjectId, PersistenceMappingError>
  readonly allocateSubjectIdSync?: () => NativeSubjectId
  readonly decodeGeneratedId?: (
    rows: ReadonlyArray<unknown>
  ) => Effect.Effect<NativeSubjectId, PersistenceMappingError>
}

export interface EmailRegistrationIdentifierTable<
  Identifier extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> {
  readonly table: Identifier["table"]
  readonly namespace: ColumnKey<Identifier>
  readonly value: ColumnKey<Identifier>
  /** Atomic mailbox registration may reassign an unverified binding in place.
   * Only subjectId, verifiedAt and bindingRevision change; the supplied proof
   * authority must admit only absent or active-unverified registration targets.
   * Its prior subject's mapped securityRevision advances in the same commit. */
  readonly subjectId: ColumnKey<Identifier>
  readonly verifiedAt: ColumnKey<Identifier>
  readonly bindingRevision: ColumnKey<Identifier>
  readonly isCurrent: (row: Identifier["select"]) => boolean
  readonly isMutableTarget: (row: Identifier["select"]) => boolean
  readonly d1MutableTargetCondition?: (input: {
    readonly identifier: LoginIdentifier
    readonly nativeSubjectId: NativeSubjectId
  }) => Expression
  readonly d1CurrentCondition?: (input: {
    readonly identifier: LoginIdentifier
    readonly nativeSubjectId: NativeSubjectId
    readonly bindingRevision: SecurityRevision
  }) => Expression
  readonly encodeVerifiedInsert: (input: {
    readonly identifier: LoginIdentifier
    readonly subjectId: NativeSubjectId
    readonly verifiedAtMillis: number
    readonly bindingRevision: SecurityRevision
  }) => Identifier["insert"]
}

export interface EmailRegistrationCredentialTable<Credential extends Table, NativeSubjectId> {
  readonly table: Credential["table"]
  readonly moduleId: ColumnKey<Credential>
  readonly subjectId: ColumnKey<Credential>
  readonly credentialId: ColumnKey<Credential>
  readonly identifierNamespace: ColumnKey<Credential>
  readonly identifierValue: ColumnKey<Credential>
  readonly credentialRevision: ColumnKey<Credential>
  readonly status: ColumnKey<Credential>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeStatusValue: unknown
  readonly encodeVerifiedInsert: (input: {
    readonly moduleId: string
    readonly subjectId: NativeSubjectId
    readonly credentialId: string
    readonly identifier: LoginIdentifier
    readonly credentialRevision: SecurityRevision
  }) => Credential["insert"]
}

export interface EmailRegistrationAuthorityCredentialTable<
  Credential extends Table,
  NativeSubjectId
> {
  readonly table: Credential["table"]
  readonly subjectId: ColumnKey<Credential>
  readonly credentialId: ColumnKey<Credential>
  readonly revision: ColumnKey<Credential>
  readonly status: ColumnKey<Credential>
  readonly isActiveStatus: (value: unknown) => boolean
  readonly activeStatusValue: unknown
  readonly encodeInsert: (input: {
    readonly subjectId: NativeSubjectId
    readonly credentialId: string
    readonly revision: SecurityRevision
  }) => Credential["insert"]
}

export interface RequiredEmailRegistrationConstraints extends RequiredEmailSignInConstraints {
  readonly authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)"
}

export const requiredEmailRegistrationConstraints: RequiredEmailRegistrationConstraints = {
  ...requiredEmailSignInConstraints,
  authorityCredential: "unique(authorityCredential.subjectId,authorityCredential.credentialId)"
}

type EmailRegistrationBase<Registration> = {
  readonly inspect: (input: {
    readonly identifier: LoginIdentifier
    readonly registration: Registration
  }) => Effect.Effect<
    { readonly eligible: boolean; readonly fingerprint: TokenDigest },
    PersistenceMappingError
  >
  readonly snapshotRegistration: (
    registration: Registration
  ) => Effect.Effect<Registration, PersistenceMappingError>
  readonly snapshotRegistrationSync?: (registration: Registration) => Registration
  readonly inspectSync?: (input: {
    readonly identifier: LoginIdentifier
    readonly registration: Registration
  }) => { readonly eligible: boolean; readonly fingerprint: TokenDigest }
}

export type EmailRegistrationMapping<
  Registration,
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId,
  Expression extends SqlExpression = SqlExpression
> = EmailRegistrationBase<Registration> & {
  readonly mode: "atomic"
  readonly clock: ProofClock<Expression>
  readonly d1?: { readonly primary: true }
  readonly subject: EmailSubjectReadTable<Subject>
  readonly identifier: EmailRegistrationIdentifierTable<Identifier, NativeSubjectId, Expression>
  readonly credential: EmailRegistrationCredentialTable<Credential, NativeSubjectId>
  readonly authorityCredential: EmailRegistrationAuthorityCredentialTable<
    AuthorityCredential,
    NativeSubjectId
  >
  readonly subjectId: SubjectIdCodec<NativeSubjectId>
  readonly constraints: RequiredEmailRegistrationConstraints
  readonly allocateCredentialId?: Effect.Effect<string, PersistenceMappingError>
  readonly allocateCredentialIdSync?: () => string
  readonly allocateRevision?: Effect.Effect<SecurityRevision, PersistenceMappingError>
  readonly allocateRevisionSync?: () => SecurityRevision
  readonly isIdentifierConflict: (cause: unknown) => boolean
  readonly isCredentialConflict: (cause: unknown) => boolean
  readonly provisioning:
    & EmailRegistrationProvisioning<Registration, Subject, NativeSubjectId>
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

export type AnyEmailSignInMapping = EmailSignInMapping<
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  unknown
>

export type AnyEmailAddressMapping<Expression extends SqlExpression = SqlExpression> = EmailAddressMapping<
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  unknown,
  Expression
>

export type AnyEmailRegistrationMapping<
  Registration = unknown,
  Expression extends SqlExpression = SqlExpression
> = EmailRegistrationMapping<
  Registration,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  AnyTableModel,
  unknown,
  Expression
>
