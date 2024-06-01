/**
 * @since 1.0.0
 */
import type { SqlError } from "@effect/sql/Error"
import type { QueryResultKind } from "drizzle-orm/pg-core"
import { PgDeleteBase, PgInsertBase, PgSelectBase, PgUpdateBase } from "drizzle-orm/pg-core"
import { PgRelationalQuery } from "drizzle-orm/pg-core/query-builders/query"
import { PgRaw } from "drizzle-orm/pg-core/query-builders/raw"
import { drizzle } from "drizzle-orm/postgres-js"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { patchQueryBuilder } from "./internal/patch-query-builders.js"

export interface DrizzlePgDatabase extends
  Omit<
    ReturnType<typeof drizzle>,
    "run" | "all" | "get" | "values" | "transaction" | "execute" | "refreshMaterializedView" | "query" | "_"
  >
{}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<DrizzlePgDatabase> = Effect.sync(() => {
  // instanciate the db without a client, since we are going to attach the client to the QueryBuilder
  const db = drizzle({
    options: {
      parsers: [],
      serializers: []
    }
  } as any) as DrizzlePgDatabase
  patchQueryBuilder(PgSelectBase)
  patchQueryBuilder(PgInsertBase)
  patchQueryBuilder(PgUpdateBase)
  patchQueryBuilder(PgDeleteBase)
  patchQueryBuilder(PgRelationalQuery)
  patchQueryBuilder(PgRaw)
  return db
})

/**
 * @since 1.0.0
 * @category tags
 */
export class PgDrizzle extends Context.Tag("@effect/sql-drizzle/Pg")<
  PgDrizzle,
  DrizzlePgDatabase
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<PgDrizzle, never, never> = Layer.effect(PgDrizzle, make)

declare module "drizzle-orm/pg-core" {
  export interface PgSelectBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTableName,
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
  > extends Effect.Effect<TResult, SqlError> {
  }

  export interface PgInsertBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTable,
    TQueryResult,
    TReturning,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods
  > extends
    Effect.Effect<TReturning extends undefined ? QueryResultKind<TQueryResult, never> : Array<TReturning>, SqlError>
  {}

  export interface PgUpdateBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTable,
    TQueryResult,
    TReturning,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods
  > extends
    Effect.Effect<TReturning extends undefined ? QueryResultKind<TQueryResult, never> : Array<TReturning>, SqlError>
  {}

  export interface PgDeleteBase<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TTable,
    TQueryResult,
    TReturning,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TDynamic,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    TExcludedMethods
  > extends
    Effect.Effect<TReturning extends undefined ? QueryResultKind<TQueryResult, never> : Array<TReturning>, SqlError>
  {}
}

declare module "drizzle-orm/pg-core/query-builders/query" {
  export interface PgRelationalQuery<TResult> extends Effect.Effect<TResult, SqlError> {
  }
}

declare module "drizzle-orm/pg-core/query-builders/raw" {
  export interface PgRaw<TResult> extends Effect.Effect<TResult, SqlError> {
  }
}
