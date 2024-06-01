/**
 * @since 1.0.0
 */
import type { SqlError } from "@effect/sql/Error"
import type { QueryResultKind } from "drizzle-orm/mysql-core"
import { MySqlDeleteBase, MySqlInsertBase, MySqlSelectBase, MySqlUpdateBase } from "drizzle-orm/mysql-core"
import { drizzle } from "drizzle-orm/mysql2"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { patchQueryBuilder } from "./internal/patch-query-builders.js"

export interface DrizzleMySqlDatabase
  extends Omit<ReturnType<typeof drizzle>, "run" | "all" | "get" | "values" | "transaction" | "execute" | "query" | "_">
{}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<DrizzleMySqlDatabase> = Effect.sync(() => {
  // instanciate the db without a client, since we are going to attach the client to the QueryBuilder
  const db = drizzle({} as any) as DrizzleMySqlDatabase
  patchQueryBuilder(MySqlSelectBase)
  patchQueryBuilder(MySqlInsertBase)
  patchQueryBuilder(MySqlUpdateBase)
  patchQueryBuilder(MySqlDeleteBase)
  return db
})

/**
 * @since 1.0.0
 * @category tags
 */
export class MysqlDrizzle extends Context.Tag("@effect/sql-drizzle/Mysql")<
  MysqlDrizzle,
  DrizzleMySqlDatabase
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<MysqlDrizzle, never, never> = Layer.effect(MysqlDrizzle, make)

declare module "drizzle-orm/mysql-core" {
  export interface MySqlSelectBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTableName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TSelection,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TSelectMode,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TPreparedQueryHKT,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TNullabilityMap,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods,
    TResult,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TSelectedFields
  > extends Effect.Effect<TResult, SqlError> {
  }

  export interface MySqlInsertBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTable,
    TQueryResult,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TPreparedQueryHKT,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods
  > extends Effect.Effect<QueryResultKind<TQueryResult, never>, SqlError> {
  }

  export interface MySqlUpdateBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTable,
    TQueryResult,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TPreparedQueryHKT,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods
  > extends Effect.Effect<QueryResultKind<TQueryResult, never>, SqlError> {
  }

  export interface MySqlDeleteBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTable,
    TQueryResult,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TPreparedQueryHKT,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods
  > extends Effect.Effect<QueryResultKind<TQueryResult, never>, SqlError> {
  }
}
