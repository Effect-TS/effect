import * as Client from "@effect/sql/SqlClient"
import { SqlError } from "@effect/sql/SqlError"
import type { Statement } from "@effect/sql/Statement"
import type { QueryPromise } from "drizzle-orm/query-promise"
import * as DUtils from "drizzle-orm/utils"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import { globalValue } from "effect/GlobalValue"
import * as Runtime from "effect/Runtime"

const clientRegistry = globalValue(
  "@effect/sql-drizzle/clientRegistry",
  () => new WeakMap<any, Client.SqlClient>()
)

/** @internal */
export const registerDialect = (dialect: unknown, client: Client.SqlClient) => {
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
        catch: (cause) => new SqlError({ cause, message: "Failed to execute QueryPromise" })
      })
    }
    const prepared = this.prepare()
    let statement: Statement<any>
    if ("query" in prepared) {
      statement = client.unsafe(prepared.query.sql, prepared.query.params)
    } else if ("queryString" in prepared) {
      statement = client.unsafe(prepared.queryString, prepared.params)
    } else {
      const { params, sql } = this.toSQL()
      statement = client.unsafe(sql, params)
    }
    return Effect.map(
      statement.values,
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
  const client = yield* Client.SqlClient
  const runtime = yield* Effect.runtime<never>()
  const runPromise = Runtime.runPromise(runtime)
  return (sql: string, params: Array<any>, method: "all" | "execute" | "get" | "values" | "run") => {
    const statement = client.unsafe(sql, params)
    if (method === "execute") {
      return runPromise(Effect.map(statement.raw, (header) => ({ rows: [header] })))
    }
    let effect: Effect.Effect<any, SqlError> = method === "all" || method === "values"
      ? statement.values
      : statement.withoutTransform
    if (method === "get") {
      effect = Effect.map(effect, (rows) => rows[0] ?? [])
    }
    return runPromise(Effect.map(effect, (rows) => ({ rows })))
  }
})
