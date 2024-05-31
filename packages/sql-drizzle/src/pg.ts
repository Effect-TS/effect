/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import { drizzle } from "drizzle-orm/node-postgres"
import { PgDeleteBase, PgInsertBase, PgSelectBase, PgUpdateBase } from "drizzle-orm/pg-core"
import { PgRelationalQuery } from "drizzle-orm/pg-core/query-builders/query"
import { PgRaw } from "drizzle-orm/pg-core/query-builders/raw"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { registerQueryBuilder } from "./internal/registry.js"
import type { DrizzleDatabase } from "./internal/registry.types.js"

export interface DrizzlePgDatabase extends
  DrizzleDatabase,
  Omit<
    ReturnType<typeof drizzle>,
    "run" | "all" | "get" | "values" | "transaction" | "execute" | "refreshMaterializedView" | "query" | "_"
  >
{}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<DrizzlePgDatabase, never, Client.Client> = Effect.gen(function*() {
  const client = yield* Client.Client
  // instanciate the db without a client, since we are going to attach the client to the QueryBuilder
  const db = drizzle({} as any) as unknown as DrizzlePgDatabase
  registerQueryBuilder(db, client, PgSelectBase)
  registerQueryBuilder(db, client, PgInsertBase)
  registerQueryBuilder(db, client, PgUpdateBase)
  registerQueryBuilder(db, client, PgDeleteBase)
  registerQueryBuilder(db, client, PgRelationalQuery)
  registerQueryBuilder(db, client, PgRaw)
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
export const layer: Layer.Layer<PgDrizzle, never, Client.Client> = Layer.effect(PgDrizzle, make)
