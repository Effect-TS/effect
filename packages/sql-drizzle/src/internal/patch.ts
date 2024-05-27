import * as Client from "@effect/sql/Client"
import { SqlError } from "@effect/sql/Error"
import type { QueryPromise } from "drizzle-orm/query-promise"
import * as DUtils from "drizzle-orm/utils"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { globalValue } from "effect/GlobalValue"
import * as Runtime from "effect/Runtime"

const clientRegistry = globalValue(
  "@effect/sql-drizzle/clientRegistry",
  () => new WeakMap<any, Client.Client>()
)

/** @internal */
export const registerDialect = (dialect: unknown, client: Client.Client) => {
  clientRegistry.set(dialect, client)
}

const mapResultRow = (DUtils as any).mapResultRow

const PatchProto = {
  ...Effectable.CommitPrototype,
  commit(
    this: QueryPromise<unknown> & {
      readonly prepare: () => any
      readonly dialect: any
      readonly toSQL: () => { sql: string; params: Array<any> }
    }
  ) {
    const client = clientRegistry.get(this.dialect)
    if (client === undefined) {
      return Effect.tryPromise({
        try: () => this.execute(),
        catch: (error) => new SqlError({ error })
      })
    }
    const prepared = this.prepare()
    const { params, sql } = this.toSQL()
    return Effect.map(
      client.unsafe(sql, params).values,
      (rows) => rows.map((row) => mapResultRow(prepared.fields, row, prepared.joinsNotNullableMap))
    )
  }
}

/** @internal */
export const patch = (prototype: any) => {
  if (Effect.EffectTypeId in prototype) {
    return
  }
  Object.assign(prototype, PatchProto)
}

/** @internal */
export const makeRemoteCallback = Effect.gen(function*() {
  const client = yield* Client.Client
  const runtime = yield* Effect.runtime<never>()
  const runPromise = Runtime.runPromise(runtime)
  return (sql: string, params: Array<any>, method: "all" | "execute" | "get" | "values" | "run") => {
    const statement = client.unsafe(sql, params)
    let effect: Effect.Effect<any, SqlError> = method === "all" || method === "values"
      ? statement.values
      : statement.withoutTransform
    if (method === "get") {
      effect = Effect.map(effect, (rows) => rows[0] ?? [])
    }
    return runPromise(Effect.map(effect, (rows) => ({ rows })))
  }
})
