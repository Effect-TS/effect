/**
 * @since 1.0.0
 */
import type * as Client from "@effect/sql/Client"
import { TypedQueryBuilder } from "drizzle-orm/query-builders/query-builder"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { globalValue } from "effect/GlobalValue"

const clientRegistry = globalValue(
  "@effect/sql-drizzle/clientRegistry",
  () => new WeakMap<any, Client.Client>()
)

/**
 * @since 1.0.0
 */
export const registerDialect = (dialect: unknown, client: Client.Client) => {
  if (!(Effect.EffectTypeId in TypedQueryBuilder.prototype)) {
    Object.assign(TypedQueryBuilder.prototype, {
      ...Effectable.CommitPrototype,
      commit(this: any) {
        const client = clientRegistry.get(this.dialect)
        if (client === undefined) {
          return Effect.die("drizzle QueryBuilder not registered")
        }
        const { params, sql } = this.toSQL()
        return client.unsafe(sql, params)
      }
    })
  }
  clientRegistry.set(dialect, client)
}
