import * as Shared from "@effect/auth-persistence/Adapter"
import type { SQL, Table } from "drizzle-orm"

import type { DrizzleTableModel } from "./tableModel.ts"

export {
  type OAuthAction,
  type OAuthD1Mapping,
  type OAuthEligibilityFact,
  type OAuthRegistrationAuthority,
  requiredOAuthRegistrationConstraints,
  requiredOAuthSignInConstraints
} from "@effect/auth-persistence/Adapter"

export type OAuthClock = Shared.OAuthClock<SQL>

export type OAuthSubjectReadTable<S extends Table> = Shared.OAuthSubjectReadTable<
  DrizzleTableModel<S>,
  SQL
>

export type OAuthSubjectTable<S extends Table> = Shared.OAuthSubjectTable<
  DrizzleTableModel<S>,
  SQL
>

export type OAuthOwnershipReadTable<O extends Table, N> = Shared.OAuthOwnershipReadTable<
  DrizzleTableModel<O>,
  N
>

export type OAuthOwnershipTable<O extends Table, N> = Shared.OAuthOwnershipTable<
  DrizzleTableModel<O>,
  N
>

export type OAuthCredentialReadTable<C extends Table> = Shared.OAuthCredentialReadTable<
  DrizzleTableModel<C>,
  SQL
>

export type OAuthCredentialTable<C extends Table, N> = Shared.OAuthCredentialTable<
  DrizzleTableModel<C>,
  N,
  SQL
>

export type OAuthAuthorityReadTable<C extends Table> = Shared.OAuthAuthorityReadTable<
  DrizzleTableModel<C>,
  SQL
>

export type OAuthAuthorityTable<C extends Table, N> = Shared.OAuthAuthorityTable<
  DrizzleTableModel<C>,
  N,
  SQL
>

export type OAuthFlowTable<F extends Table> = Shared.OAuthFlowTable<DrizzleTableModel<F>>

export type OAuthRegistrationIntentTable<I extends Table> = Shared.OAuthRegistrationIntentTable<
  DrizzleTableModel<I>
>

export type OAuthEligibilityTable<T extends Table, N> = Shared.OAuthEligibilityTable<
  DrizzleTableModel<T>,
  N,
  SQL
>

export type OAuthCleanupTable<T extends Table, N> = Shared.OAuthCleanupTable<
  DrizzleTableModel<T>,
  N,
  SQL
>

export type OAuthRegistrationGuardTable<
  T extends Table,
  Registration,
  N
> = Shared.OAuthRegistrationGuardTable<DrizzleTableModel<T>, Registration, N, SQL>

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
  DrizzleTableModel<S>,
  DrizzleTableModel<O>,
  DrizzleTableModel<C>,
  DrizzleTableModel<AC>,
  DrizzleTableModel<F>,
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
  DrizzleTableModel<S>,
  DrizzleTableModel<O>,
  DrizzleTableModel<C>,
  DrizzleTableModel<AC>,
  DrizzleTableModel<F>,
  N,
  SQL,
  Table
>

export type OAuthRegistrationIntentMapping<
  O extends Table,
  I extends Table,
  N
> = Shared.OAuthRegistrationIntentMapping<DrizzleTableModel<O>, DrizzleTableModel<I>, N, SQL>

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
  DrizzleTableModel<S>,
  DrizzleTableModel<O>,
  DrizzleTableModel<C>,
  DrizzleTableModel<AC>,
  DrizzleTableModel<I>,
  N,
  SQL,
  Table
>

export const oauthEligibilityTable = <T extends Table, N>(input: OAuthEligibilityTable<T, N>) =>
  Shared.oauthEligibilityTable<DrizzleTableModel<T>, N, SQL>(input)

export const oauthCleanupTable = <T extends Table, N>(input: OAuthCleanupTable<T, N>) =>
  Shared.oauthCleanupTable<DrizzleTableModel<T>, N, SQL>(input)

export const oauthRegistrationGuardTable = <T extends Table, Registration, N>(
  input: OAuthRegistrationGuardTable<T, Registration, N>
) => Shared.oauthRegistrationGuardTable<DrizzleTableModel<T>, Registration, N, SQL>(input)
