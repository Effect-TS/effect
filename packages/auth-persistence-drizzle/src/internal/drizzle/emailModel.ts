import type * as Shared from "@effect/auth-persistence/Adapter"
import type { SQL, Table } from "drizzle-orm"

import type { ClockMapping } from "./nativeClock.ts"
import type { DrizzleTableModel } from "./tableModel.ts"

export {
  type EmailRegistrationIntent,
  type RequiredEmailAddressConstraints,
  requiredEmailAddressConstraints,
  type RequiredEmailRegistrationConstraints,
  requiredEmailRegistrationConstraints,
  type RequiredEmailSignInConstraints,
  requiredEmailSignInConstraints
} from "@effect/auth-persistence/Adapter"

export type EmailSubjectReadTable<Subject extends Table> = Shared.EmailSubjectReadTable<
  DrizzleTableModel<Subject>
>

export type EmailSubjectTable<Subject extends Table> = Shared.EmailSubjectTable<
  DrizzleTableModel<Subject>
>

export type EmailIdentifierReadTable<Identifier extends Table> = Shared.EmailIdentifierReadTable<
  DrizzleTableModel<Identifier>
>

export type EmailIdentifierTable<
  Identifier extends Table,
  NativeSubjectId
> = Shared.EmailIdentifierTable<DrizzleTableModel<Identifier>, NativeSubjectId, SQL>

export type EmailCredentialReadTable<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  _NativeSubjectId
> = Shared.EmailCredentialReadTable<
  DrizzleTableModel<Subject>,
  DrizzleTableModel<Identifier>,
  DrizzleTableModel<Credential>,
  _NativeSubjectId
>

export type EmailCredentialTable<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  NativeSubjectId
> = Shared.EmailCredentialTable<
  DrizzleTableModel<Subject>,
  DrizzleTableModel<Identifier>,
  DrizzleTableModel<Credential>,
  NativeSubjectId
>

export type EmailAuthorityCredentialTable<
  Credential extends Table,
  NativeSubjectId
> = Shared.EmailAuthorityCredentialTable<DrizzleTableModel<Credential>, NativeSubjectId>

export type EmailSignInMapping<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId
> = Shared.EmailSignInMapping<
  DrizzleTableModel<Subject>,
  DrizzleTableModel<Identifier>,
  DrizzleTableModel<Credential>,
  DrizzleTableModel<AuthorityCredential>,
  NativeSubjectId
>

export type EmailAddressMapping<
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId
> = ClockMapping<
  Shared.EmailAddressMapping<
    DrizzleTableModel<Subject>,
    DrizzleTableModel<Identifier>,
    DrizzleTableModel<Credential>,
    DrizzleTableModel<AuthorityCredential>,
    NativeSubjectId,
    SQL
  >
>

export type EmailRegistrationProvisioning<
  Registration,
  Subject extends Table,
  NativeSubjectId
> = Shared.EmailRegistrationProvisioning<Registration, DrizzleTableModel<Subject>, NativeSubjectId>

export type EmailRegistrationIdentifierTable<
  Identifier extends Table,
  NativeSubjectId
> = Shared.EmailRegistrationIdentifierTable<DrizzleTableModel<Identifier>, NativeSubjectId, SQL>

export type EmailRegistrationCredentialTable<
  Credential extends Table,
  NativeSubjectId
> = Shared.EmailRegistrationCredentialTable<DrizzleTableModel<Credential>, NativeSubjectId>

export type EmailRegistrationAuthorityCredentialTable<
  Credential extends Table,
  NativeSubjectId
> = Shared.EmailRegistrationAuthorityCredentialTable<
  DrizzleTableModel<Credential>,
  NativeSubjectId
>

export type EmailRegistrationMapping<
  Registration,
  Subject extends Table,
  Identifier extends Table,
  Credential extends Table,
  AuthorityCredential extends Table,
  NativeSubjectId
> = ClockMapping<
  Shared.EmailRegistrationMapping<
    Registration,
    DrizzleTableModel<Subject>,
    DrizzleTableModel<Identifier>,
    DrizzleTableModel<Credential>,
    DrizzleTableModel<AuthorityCredential>,
    NativeSubjectId,
    SQL
  >
>

export type AnyEmailSignInMapping = EmailSignInMapping<Table, Table, Table, Table, unknown>

export type AnyEmailAddressMapping = EmailAddressMapping<Table, Table, Table, Table, unknown>

export type AnyEmailRegistrationMapping<Registration = unknown> = EmailRegistrationMapping<
  Registration,
  Table,
  Table,
  Table,
  Table,
  unknown
>
