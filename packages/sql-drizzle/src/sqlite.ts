/**
 * @since 1.0.0
 */
import type { SqlError } from "@effect/sql/Error"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { SQLiteDeleteBase, SQLiteInsertBase, SQLiteSelectBase, SQLiteUpdateBase } from "drizzle-orm/sqlite-core"
import { SQLiteRelationalQuery } from "drizzle-orm/sqlite-core/query-builders/query"
import { SQLiteRaw } from "drizzle-orm/sqlite-core/query-builders/raw"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { patchQueryBuilder } from "./internal/patch-query-builders.js"

export interface DrizzleSQLiteDatabase
  extends Omit<ReturnType<typeof drizzle>, "run" | "all" | "get" | "values" | "transaction" | "query" | "_">
{}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<DrizzleSQLiteDatabase, never, never> = Effect.sync(() => {
  // instanciate the db without a client, since we are going to attach the client to the QueryBuilder
  const db = drizzle({} as any) as DrizzleSQLiteDatabase
  patchQueryBuilder(SQLiteSelectBase)
  patchQueryBuilder(SQLiteInsertBase)
  patchQueryBuilder(SQLiteUpdateBase)
  patchQueryBuilder(SQLiteDeleteBase)
  patchQueryBuilder(SQLiteRelationalQuery)
  patchQueryBuilder(SQLiteRaw)
  return db
})

/**
 * @since 1.0.0
 * @category tags
 */
export class SqliteDrizzle extends Context.Tag("@effect/sql-drizzle/Sqlite")<
  SqliteDrizzle,
  DrizzleSQLiteDatabase
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<SqliteDrizzle, never, never> = Layer.effect(SqliteDrizzle, make)

/**
 * @warning This will break as soon as the `drizzle-orm` package add/rename parameters to the `QueryBuilders` Types
 */
declare module "drizzle-orm/sqlite-core" {
  export interface SQLiteSelectBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTableName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TResultType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TRunResult,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TSelection,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TSelectMode,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TNullabilityMap,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods,
    TResult,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TSelectedFields
  > extends Effect.Effect<TResult, SqlError> {}

  export interface SQLiteInsertBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTable,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TResultType,
    TRunResult,
    TReturning,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods
  > extends Effect.Effect<TReturning extends undefined ? TRunResult : Array<TReturning>, SqlError> {}

  export interface SQLiteUpdateBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTable,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TResultType,
    TRunResult,
    TReturning,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods
  > extends Effect.Effect<TReturning extends undefined ? TRunResult : Array<TReturning>, SqlError> {}

  export interface SQLiteDeleteBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTable,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TResultType,
    TRunResult,
    TReturning,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods
  > extends Effect.Effect<TReturning extends undefined ? TRunResult : Array<TReturning>, SqlError> {}
}

declare module "drizzle-orm/sqlite-core/query-builders/query" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export interface SQLiteRelationalQuery<TType, TResult> extends Effect.Effect<TResult, SqlError> {}
}

declare module "drizzle-orm/sqlite-core/query-builders/raw" {
  export interface SQLiteRaw<TResult> extends Effect.Effect<TResult, SqlError> {}
}
