/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import { MySqlDeleteBase, MySqlInsertBase, MySqlSelectBase, MySqlUpdateBase } from "drizzle-orm/mysql-core"
import { drizzle } from "drizzle-orm/mysql2"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { registerQueryBuilder } from "./internal/registry.js"
import type { DrizzleDatabase } from "./internal/registry.types.js"

export interface DrizzleMySqlDatabase
  extends
    DrizzleDatabase,
    Omit<ReturnType<typeof drizzle>, "run" | "all" | "get" | "values" | "transaction" | "execute" | "query" | "_">
{}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<DrizzleMySqlDatabase, never, Client.Client> = Effect.gen(function*() {
  const client = yield* Client.Client
  // instanciate the db without a client, since we are going to attach the client to the QueryBuilder
  const db = drizzle({} as any) as unknown as DrizzleMySqlDatabase
  registerQueryBuilder(db, client, MySqlSelectBase)
  registerQueryBuilder(db, client, MySqlInsertBase)
  registerQueryBuilder(db, client, MySqlUpdateBase)
  registerQueryBuilder(db, client, MySqlDeleteBase)
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
export const layer: Layer.Layer<MysqlDrizzle, never, Client.Client> = Layer.effect(MysqlDrizzle, make)
