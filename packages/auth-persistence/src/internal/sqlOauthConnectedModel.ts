import type * as Shared from "./models/oauthConnectedModel.ts"
import type { SqlExpression as SQL } from "./sqlExpression.ts"
import type { SqlTableModel } from "./sqlOauthModel.ts"
import type { Table } from "./sqlTable.ts"

export {
  type OAuthConnectedAction,
  type OAuthConnectedPolicyInput,
  requiredOAuthConnectedConstraints,
  requiredOAuthConnectedRevocationConstraints
} from "./models/oauthConnectedModel.ts"

export type OAuthConnectedGrantTable<G extends Table, N> = Shared.OAuthConnectedGrantTable<
  SqlTableModel<G>,
  N
>

export type OAuthConnectedRevocationJobTable<
  J extends Table,
  N
> = Shared.OAuthConnectedRevocationJobTable<SqlTableModel<J>, N>

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
  SqlTableModel<S>,
  SqlTableModel<AC>,
  SqlTableModel<O>,
  SqlTableModel<F>,
  SqlTableModel<G>,
  N,
  SqlTableModel<J>,
  SQL,
  SqlTableModel
>

export type OAuthConnectedRevocationMapping<
  O extends Table,
  G extends Table,
  J extends Table,
  N
> = Shared.OAuthConnectedRevocationMapping<
  SqlTableModel<O>,
  SqlTableModel<G>,
  SqlTableModel<J>,
  N,
  SQL
>
