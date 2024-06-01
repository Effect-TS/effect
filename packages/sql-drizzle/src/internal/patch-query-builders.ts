/**
 * @since 1.0.0
 */
import * as Client from "@effect/sql/Client"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"

import type { DrizzleEntity, Query } from "drizzle-orm"

type ClassType = { new(...args: Array<any>): any }

interface DrizzleQueryBuilderInstance extends DrizzleEntity {
  toSQL(): Query
}

export const patchQueryBuilder = (QueryBuilderClass: ClassType) => {
  if (!(Effect.EffectTypeId in QueryBuilderClass.prototype)) {
    Object.assign(QueryBuilderClass.prototype, {
      ...Effectable.CommitPrototype,
      commit(this: DrizzleQueryBuilderInstance) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        return Effect.gen(function*() {
          const { params, sql } = self.toSQL()
          const client = yield* Client.Client
          return yield* client.unsafe(sql, params as any)
        })
      }
    })
  }
}
