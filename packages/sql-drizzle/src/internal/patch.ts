import * as Client from "@effect/sql/SqlClient"
import { SqlError } from "@effect/sql/SqlError"
import type { QueryPromise } from "drizzle-orm/query-promise"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as Runtime from "effect/Runtime"

let cli: any = undefined

const PatchProto = {
  ...Effectable.CommitPrototype,
  commit(
    this: QueryPromise<unknown> & {
      readonly prepare: () => any
      readonly dialect: any
      readonly toSQL: () => { sql: string; params: Array<any> }
    }
  ) {
    return Effect.runtime().pipe(
      Effect.flatMap((context) =>
        Effect.tryPromise({
          try: () => {
            cli = context
            const out = this.execute()
            cli = undefined
            return out
          },
          catch: (cause) => new SqlError({ cause, message: "Failed to execute QueryPromise" })
        })
      )
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
  return (sql: string, params: Array<any>, method: "all" | "execute" | "get" | "values" | "run") => {
    const runPromise = Runtime.runPromise(cli ? cli : runtime)
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
