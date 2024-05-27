/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import type { SqlError } from "@effect/sql/Error"
import { PgSelectBase } from "drizzle-orm/pg-core"
import { drizzle } from "drizzle-orm/pg-proxy"
import type { PgRemoteDatabase } from "drizzle-orm/pg-proxy"
import { QueryPromise } from "drizzle-orm/query-promise"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { makeRemoteCallback, patch, registerDialect } from "./internal/patch.js"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: Effect.Effect<PgRemoteDatabase, never, Client.Client> = Effect.gen(function*() {
  const client = yield* Client.Client
  const db = drizzle(yield* makeRemoteCallback)
  registerDialect((db as any).dialect, client)
  patch(QueryPromise.prototype)
  patch(PgSelectBase.prototype)
  return db
})

/**
 * @since 1.0.0
 * @category tags
 */
export class PgDrizzle extends Context.Tag("@effect/sql-drizzle/Pg")<
  PgDrizzle,
  PgRemoteDatabase
>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<PgDrizzle, never, Client.Client> = Layer.effect(PgDrizzle, make)

declare module "drizzle-orm" {
  export interface QueryPromise<T> extends Effect.Effect<T, SqlError> {}
}
