import * as Client from "@effect/sql/SqlClient"
import { SqlError } from "@effect/sql/SqlError"
import type { QueryPromise } from "drizzle-orm/query-promise"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as Runtime from "effect/Runtime"

let currentRuntime: any = undefined

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
            const pre = currentRuntime
            currentRuntime = context
            const out = this.execute()
            currentRuntime = pre
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

type Method = "all" | "execute" | "get" | "values" | "run"

const makeRemote = Effect.gen(function*() {
  const client = yield* Client.SqlClient
  const constructionRuntime = yield* Effect.runtime<never>()
  const query = (sql: string, params: Array<any>, method: Method): Effect.Effect<{ rows: any }, SqlError> => {
    const statement = client.unsafe(sql, params)
    if (method === "execute") {
      return Effect.map(statement.raw, (header) => ({ rows: [header] }))
    }
    if (method === "get") {
      return Effect.map(statement.values, (rows) => ({ rows: rows[0] }))
    }
    const effect: Effect.Effect<any, SqlError> = method === "all" || method === "values"
      ? statement.values
      : statement.withoutTransform
    return Effect.map(effect, (rows) => ({ rows }))
  }
  const runPromise = <A>(effect: Effect.Effect<A, SqlError>): Promise<A> =>
    Runtime.runPromise(currentRuntime ? currentRuntime : constructionRuntime)(Effect.either(effect)).then((res) => {
      if (res._tag === "Left") {
        throw res.left.cause
      }
      return res.right
    })
  return { client, query, runPromise } as const
})

/** @internal */
export const makeRemoteCallback = Effect.map(
  makeRemote,
  ({ query, runPromise }) => (sql: string, params: Array<any>, method: Method) => runPromise(query(sql, params, method))
)

/** @internal */
export const makeRemoteBatchCallback = Effect.map(
  makeRemote,
  ({ client, query, runPromise }) =>
  (
    batch: ReadonlyArray<{ readonly sql: string; readonly params: Array<any>; readonly method: Method }>
  ) => runPromise(client.withTransaction(Effect.forEach(batch, (_) => query(_.sql, _.params, _.method))))
)
