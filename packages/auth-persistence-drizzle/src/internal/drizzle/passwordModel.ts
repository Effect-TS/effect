import type * as Shared from "@effect/auth-persistence/Adapter"
import type { SQL, Table } from "drizzle-orm"

import type { ClockMapping } from "./nativeClock.ts"
import type { DrizzleTableModel } from "./tableModel.ts"

export {
  type PasswordRegistrationConstraintClassifier,
  type PasswordRegistrationIntent,
  type RequiredPasswordConstraints,
  requiredPasswordConstraints,
  type RequiredPasswordRegistrationConstraints,
  requiredPasswordRegistrationConstraints
} from "@effect/auth-persistence/Adapter"

export type PasswordSubjectTable<
  Subject extends Table,
  _NativeSubjectId
> = Shared.PasswordSubjectTable<DrizzleTableModel<Subject>, _NativeSubjectId>

export type PasswordIdentifierTable<
  Identifier extends Table,
  NativeSubjectId
> = Shared.PasswordIdentifierTable<DrizzleTableModel<Identifier>, NativeSubjectId, SQL>

export type PasswordAuthorityCredentialTable<
  Credential extends Table,
  NativeSubjectId
> = Shared.PasswordAuthorityCredentialTable<DrizzleTableModel<Credential>, NativeSubjectId>

export type PasswordCredentialTable<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  NativeSubjectId
> = Shared.PasswordCredentialTable<
  DrizzleTableModel<Subject>,
  DrizzleTableModel<Identifier>,
  DrizzleTableModel<Credential>,
  NativeSubjectId
>

export type PasswordPersistenceMapping<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId
> = ClockMapping<
  Shared.PasswordPersistenceMapping<
    DrizzleTableModel<Subject>,
    DrizzleTableModel<Identifier>,
    DrizzleTableModel<Credential>,
    DrizzleTableModel<AuthorityCredential>,
    NativeSubjectId,
    SQL
  >
>

export type PasswordRegistrationProvisioning<
  Registration,
  Subject extends Table,
  NativeSubjectId
> = Shared.PasswordRegistrationProvisioning<
  Registration,
  DrizzleTableModel<Subject>,
  NativeSubjectId
>

export type PasswordRegistrationMapping<
  Registration,
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId
> = Shared.PasswordRegistrationMapping<
  Registration,
  DrizzleTableModel<Subject>,
  DrizzleTableModel<Identifier>,
  DrizzleTableModel<Credential>,
  DrizzleTableModel<AuthorityCredential>,
  NativeSubjectId,
  SQL
>

export type AnyPasswordPersistenceMapping = PasswordPersistenceMapping<
  Table,
  Table,
  Table,
  Table,
  unknown
>

export type AnyPasswordRegistrationMapping<Registration = unknown> = PasswordRegistrationMapping<
  Registration,
  Table,
  Table,
  Table,
  Table,
  unknown
>
