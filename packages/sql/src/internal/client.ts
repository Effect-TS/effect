import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"
import type * as Client from "../Client.js"
import type * as Connection from "../Connection.js"
import type * as Error from "../Error.js"
import * as Statement from "../Statement.js"

/** @internal */
export const TypeId: Client.TypeId = Symbol.for("@effect/sql/Client") as Client.TypeId

/** @internal */
export const TransactionConnection = Context.GenericTag<
  Client.TransactionConnection,
  readonly [conn: Connection.Connection, counter: number]
>("@effect/sql/Client/TransactionConnection")

/** @internal */
export function make({
  acquirer,
  beginTransaction = "BEGIN",
  commit = "COMMIT",
  compiler,
  rollback = "ROLLBACK",
  rollbackSavepoint = (id) => `ROLLBACK TO SAVEPOINT ${id}`,
  savepoint = (id) => `SAVEPOINT ${id}`,
  transactionAcquirer
}: Client.Client.MakeOptions): Client.Client {
  const getConnection = Effect.flatMap(
    Effect.serviceOption(TransactionConnection),
    Option.match({
      onNone: () => acquirer,
      onSome: ([conn]) => Effect.succeed(conn)
    })
  )

  const makeRootTx: Effect.Effect<
    readonly [Scope.CloseableScope | undefined, Connection.Connection, number],
    Error.SqlError
  > = Effect.flatMap(
    Scope.make(),
    (scope) => Effect.map(Scope.extend(transactionAcquirer, scope), (conn) => [scope, conn, 0] as const)
  )

  const withTransaction = <R, E, A>(
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E | Error.SqlError, R> =>
    Effect.acquireUseRelease(
      pipe(
        Effect.serviceOption(TransactionConnection),
        Effect.flatMap(
          Option.match({
            onNone: () => makeRootTx,
            onSome: ([conn, count]) => Effect.succeed([undefined, conn, count + 1] as const)
          })
        ),
        Effect.tap(([, conn, id]) =>
          id > 0
            ? conn.executeRaw(savepoint(`effect_sql_${id}`))
            : conn.executeRaw(beginTransaction)
        )
      ),
      ([, conn, id]) => Effect.provideService(effect, TransactionConnection, [conn, id]),
      ([scope, conn, id], exit) => {
        const effect = Exit.isSuccess(exit)
          ? id > 0
            ? Effect.unit
            : Effect.orDie(conn.executeRaw(commit))
          : id > 0
          ? Effect.orDie(conn.executeRaw(rollbackSavepoint(`effect_sql_${id}`)))
          : Effect.orDie(conn.executeRaw(rollback))
        return scope !== undefined ? Effect.ensuring(effect, Scope.close(scope, exit)) : effect
      }
    )

  const client: Client.Client = Object.assign(
    Statement.make(getConnection, compiler),
    {
      [TypeId as Client.TypeId]: TypeId as Client.TypeId,
      safe: undefined as any,
      withTransaction,
      reserve: transactionAcquirer
    }
  )
  ;(client as any).safe = client

  return client
}

/** @internal */
export const defaultTransforms = (
  transformer: (str: string) => string,
  nested = true
) => {
  const transformValue = (value: any) => {
    if (Array.isArray(value)) {
      if (value.length === 0 || value[0].constructor !== Object) {
        return value
      }
      return array(value)
    } else if (value?.constructor === Object) {
      return transformObject(value)
    }
    return value
  }

  const transformObject = (obj: Record<string, any>): any => {
    const newObj: Record<string, any> = {}
    for (const key in obj) {
      newObj[transformer(key)] = transformValue(obj[key])
    }
    return newObj
  }

  const transformArrayNested = <A extends object>(
    rows: ReadonlyArray<A>
  ): ReadonlyArray<A> => {
    const newRows: Array<A> = new Array(rows.length)
    for (let i = 0, len = rows.length; i < len; i++) {
      const row = rows[i]
      const obj: any = {}
      for (const key in row) {
        obj[transformer(key)] = transformValue(row[key])
      }
      newRows[i] = obj
    }
    return newRows
  }

  const transformArray = <A extends object>(
    rows: ReadonlyArray<A>
  ): ReadonlyArray<A> => {
    const newRows: Array<A> = new Array(rows.length)
    for (let i = 0, len = rows.length; i < len; i++) {
      const row = rows[i]
      const obj: any = {}
      for (const key in row) {
        obj[transformer(key)] = row[key]
      }
      newRows[i] = obj
    }
    return newRows
  }

  const array = nested ? transformArrayNested : transformArray

  return {
    value: transformValue,
    object: transformObject,
    array
  } as const
}
