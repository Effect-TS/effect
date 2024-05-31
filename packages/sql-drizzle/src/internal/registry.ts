/**
 * @since 1.0.0
 */
import type * as Client from "@effect/sql/Client"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { globalValue } from "effect/GlobalValue"
import type { ClassType, DrizzleDatabase, DrizzleDialect, DrizzleQueryBuilderInstance } from "./registry.types.js"

const clientRegistry = globalValue(
  "@effect/sql-drizzle/clientRegistry",
  () => new WeakMap<DrizzleDialect, Client.Client>()
)

/**
 * internal function to register an effect sql client with a QueryBuilder and attach it to the db dialect
 * dialect being the link between a QueryBuilder and the db since drizzle passes the db dialect instance to the QueryBuilder
 * effectively allowing to attach a multiple sql clients to the same QueryBuilder
 *
 * @warning dialect is a private field in drizzle, so it could be changed in the future and break this function
 */
export const registerQueryBuilder = (db: DrizzleDatabase, client: Client.Client, QueryBuilderClass: ClassType) => {
  if (!(Effect.EffectTypeId in QueryBuilderClass.prototype)) {
    Object.assign(QueryBuilderClass.prototype, {
      ...Effectable.CommitPrototype,
      commit(this: DrizzleQueryBuilderInstance) {
        const client = clientRegistry.get(this.dialect)
        if (!client) {
          return Effect.die(new Error("drizzle QueryBuilder not registered"))
        }
        const { params, sql } = this.toSQL()
        return client.unsafe(sql, params as any)
      }
    })
  }
  clientRegistry.set(db.dialect, client)
}
