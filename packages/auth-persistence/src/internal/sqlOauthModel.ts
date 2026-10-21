import * as Shared from "./models/oauthModel.ts"
import type { SqlExpression as SQL } from "./sqlExpression.ts"
import type { Table } from "./sqlTable.ts"
import type { TableModel } from "./tableModel.ts"

export interface SqlTableModel<T extends Table = Table> extends TableModel {
  readonly table: T
}

export {
  type OAuthAction,
  type OAuthD1Mapping,
  type OAuthEligibilityFact,
  type OAuthRegistrationAuthority,
  requiredOAuthRegistrationConstraints,
  requiredOAuthSignInConstraints
} from "./models/oauthModel.ts"

export type OAuthClock = Shared.OAuthClock<SQL>

export type OAuthSubjectReadTable<S extends Table> = Shared.OAuthSubjectReadTable<
  SqlTableModel<S>,
  SQL
>

export type OAuthSubjectTable<S extends Table> = Shared.OAuthSubjectTable<SqlTableModel<S>, SQL>

export type OAuthOwnershipReadTable<O extends Table, N> = Shared.OAuthOwnershipReadTable<
  SqlTableModel<O>,
  N
>

export type OAuthOwnershipTable<O extends Table, N> = Shared.OAuthOwnershipTable<
  SqlTableModel<O>,
  N
>

export type OAuthCredentialReadTable<C extends Table> = Shared.OAuthCredentialReadTable<
  SqlTableModel<C>,
  SQL
>

export type OAuthCredentialTable<C extends Table, N> = Shared.OAuthCredentialTable<
  SqlTableModel<C>,
  N,
  SQL
>

export type OAuthAuthorityReadTable<C extends Table> = Shared.OAuthAuthorityReadTable<
  SqlTableModel<C>,
  SQL
>

export type OAuthAuthorityTable<C extends Table, N> = Shared.OAuthAuthorityTable<
  SqlTableModel<C>,
  N,
  SQL
>

export type OAuthFlowTable<F extends Table> = Shared.OAuthFlowTable<SqlTableModel<F>>

export type OAuthRegistrationIntentTable<I extends Table> = Shared.OAuthRegistrationIntentTable<
  SqlTableModel<I>
>

export type OAuthEligibilityTable<T extends Table, N> = Shared.OAuthEligibilityTable<
  SqlTableModel<T>,
  N,
  SQL
>

export type OAuthCleanupTable<T extends Table, N> = Shared.OAuthCleanupTable<
  SqlTableModel<T>,
  N,
  SQL
>

export type OAuthRegistrationGuardTable<
  T extends Table,
  Registration,
  N
> = Shared.OAuthRegistrationGuardTable<SqlTableModel<T>, Registration, N, SQL>

export type OAuthRegistrationGuardDescriptor<Registration, N> = Shared.OAuthRegistrationGuardDescriptor<
  Registration,
  N,
  SQL,
  Table
>

export type OAuthEligibilityDescriptor<N> = Shared.OAuthEligibilityDescriptor<N, SQL, Table>

export type OAuthCleanupDescriptor<N> = Shared.OAuthCleanupDescriptor<N, SQL, Table>

export type OAuthSignInMapping<
  S extends Table,
  O extends Table,
  C extends Table,
  AC extends Table,
  F extends Table,
  N
> = Shared.OAuthSignInMapping<
  SqlTableModel<S>,
  SqlTableModel<O>,
  SqlTableModel<C>,
  SqlTableModel<AC>,
  SqlTableModel<F>,
  N,
  SQL
>

export type OAuthAccountsMapping<
  S extends Table,
  O extends Table,
  C extends Table,
  AC extends Table,
  F extends Table,
  N
> = Shared.OAuthAccountsMapping<
  SqlTableModel<S>,
  SqlTableModel<O>,
  SqlTableModel<C>,
  SqlTableModel<AC>,
  SqlTableModel<F>,
  N,
  SQL,
  Table
>

export type OAuthRegistrationIntentMapping<
  O extends Table,
  I extends Table,
  N
> = Shared.OAuthRegistrationIntentMapping<SqlTableModel<O>, SqlTableModel<I>, N, SQL>

export type OAuthRegistrationMapping<
  Registration,
  S extends Table,
  O extends Table,
  C extends Table,
  AC extends Table,
  I extends Table,
  N
> = Shared.OAuthRegistrationMapping<
  Registration,
  SqlTableModel<S>,
  SqlTableModel<O>,
  SqlTableModel<C>,
  SqlTableModel<AC>,
  SqlTableModel<I>,
  N,
  SQL,
  Table
>

export const oauthEligibilityTable = <T extends Table, N>(input: OAuthEligibilityTable<T, N>) =>
  Shared.oauthEligibilityTable<SqlTableModel<T>, N, SQL>(input)

export const oauthCleanupTable = <T extends Table, N>(input: OAuthCleanupTable<T, N>) =>
  Shared.oauthCleanupTable<SqlTableModel<T>, N, SQL>(input)

export const oauthRegistrationGuardTable = <T extends Table, Registration, N>(
  input: OAuthRegistrationGuardTable<T, Registration, N>
) => Shared.oauthRegistrationGuardTable<SqlTableModel<T>, Registration, N, SQL>(input)
