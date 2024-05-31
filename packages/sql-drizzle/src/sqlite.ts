/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { SQLiteDeleteBase, SQLiteInsertBase, SQLiteSelectBase, SQLiteUpdateBase } from "drizzle-orm/sqlite-core"
import { SQLiteRelationalQuery } from "drizzle-orm/sqlite-core/query-builders/query"
import { SQLiteRaw } from "drizzle-orm/sqlite-core/query-builders/raw"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { registerQueryBuilder } from "./internal/registry.js"
import type { DrizzleDatabase } from "./internal/registry.types.js"

export * from "./internal/drizzle-patch.types.js"

export interface DrizzleSQLiteDatabase
  extends
    DrizzleDatabase,
    Omit<ReturnType<typeof drizzle>, "run" | "all" | "get" | "values" | "transaction" | "query" | "_">
{}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<DrizzleSQLiteDatabase, never, Client.Client> = Effect.gen(function*() {
  const client = yield* Client.Client
  // instanciate the db without a client, since we are going to attach the client to the QueryBuilder
  const db = drizzle({} as any) as unknown as DrizzleSQLiteDatabase
  registerQueryBuilder(db, client, SQLiteSelectBase)
  registerQueryBuilder(db, client, SQLiteInsertBase)
  registerQueryBuilder(db, client, SQLiteUpdateBase)
  registerQueryBuilder(db, client, SQLiteDeleteBase)
  registerQueryBuilder(db, client, SQLiteRelationalQuery)
  registerQueryBuilder(db, client, SQLiteRaw)
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
export const layer: Layer.Layer<SqliteDrizzle, never, Client.Client> = Layer.effect(SqliteDrizzle, make)
