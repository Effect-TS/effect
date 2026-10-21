import type * as Shared from "@effect/auth-persistence/Adapter"
import type { SQL, Table } from "drizzle-orm"

import type { DrizzleTableModel } from "./tableModel.ts"

export {
  type OAuthConnectedAction,
  type OAuthConnectedPolicyInput,
  requiredOAuthConnectedConstraints,
  requiredOAuthConnectedRevocationConstraints
} from "@effect/auth-persistence/Adapter"

export type OAuthConnectedGrantTable<G extends Table, N> = Shared.OAuthConnectedGrantTable<
  DrizzleTableModel<G>,
  N
>

export type OAuthConnectedRevocationJobTable<
  J extends Table,
  N
> = Shared.OAuthConnectedRevocationJobTable<DrizzleTableModel<J>, N>

export type OAuthConnectedSqlPolicy<N> = Shared.OAuthConnectedSqlPolicy<N, SQL>

export type OAuthConnectedMapping<
  S extends Table,
  AC extends Table,
  O extends Table,
  F extends Table,
  G extends Table,
  N,
  J extends Table = Table
> = Shared.OAuthConnectedMapping<
  DrizzleTableModel<S>,
  DrizzleTableModel<AC>,
  DrizzleTableModel<O>,
  DrizzleTableModel<F>,
  DrizzleTableModel<G>,
  N,
  DrizzleTableModel<J>,
  SQL,
  DrizzleTableModel<Table>
>

export type OAuthConnectedRevocationMapping<
  O extends Table,
  G extends Table,
  J extends Table,
  N
> = Shared.OAuthConnectedRevocationMapping<
  DrizzleTableModel<O>,
  DrizzleTableModel<G>,
  DrizzleTableModel<J>,
  N,
  SQL
>
