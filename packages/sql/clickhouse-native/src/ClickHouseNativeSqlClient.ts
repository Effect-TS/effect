import type { Scope } from "effect"

import { Context, Crypto, Effect, Layer } from "effect"
import { Reactivity } from "effect/unstable/reactivity"
import { SqlClient } from "effect/unstable/sql"
import { SqlError, UnknownError } from "effect/unstable/sql/SqlError"

import type { ClickHouseConfig } from "./ClickHouseNativeConfig.js"

import { makeClickHouseNativePool } from "./ClickHouseNativePool.js"
import { makeCompiler, makeConnection, makeReservedConnection } from "./ClickHouseNativeSqlConnection.js"

export interface ClickHouseNativeSqlClientOptions {
  readonly poolSize: number
}

/**
 * Effect service backed by a scoped pool of ClickHouse Native TCP connections.
 *
 * It also exposes Effect's generic `SqlClient` for parameterized statements.
 */
export interface IClickHouseNativeSqlClient {
  readonly execute: (
    sql: string
  ) => Effect.Effect<
    ReadonlyArray<Record<string, unknown>>,
    SqlError
  >
  readonly ping: Effect.Effect<void, SqlError>
  /** Generic Effect SQL façade, also exposed through the `SqlClient` layer. */
  readonly sql: SqlClient.SqlClient
}

export class ClickHouseNativeSqlClient extends Context.Service<
  ClickHouseNativeSqlClient,
  IClickHouseNativeSqlClient
>()("@template/cli/ClickHouseNativeSqlClient") {}

export const make = (
  config: ClickHouseConfig,
  options: ClickHouseNativeSqlClientOptions
): Effect.Effect<
  IClickHouseNativeSqlClient,
  SqlError,
  Crypto.Crypto | Scope.Scope
> =>
  Effect.gen(function*() {
    const pool = yield* makeClickHouseNativePool(config, { size: options.poolSize })
    const crypto = yield* Crypto.Crypto
    const reactivity = yield* Reactivity.make
    const connection = makeConnection(pool, crypto)
    const transactionAcquirer = pool.reserve.pipe(
      Effect.map((client) => makeReservedConnection(client, crypto))
    )
    const sqlClient = yield* SqlClient.make({
      acquirer: Effect.succeed(connection),
      beginTransaction: "BEGIN TRANSACTION",
      borrower: (use) => use(connection),
      commit: "COMMIT",
      compiler: makeCompiler(),
      rollback: "ROLLBACK",
      spanAttributes: [
        ["db.system.name", "clickhouse"],
        ["db.namespace", config.database],
        ["server.address", config.host],
        ["server.port", config.port]
      ],
      transactionAcquirer
    }).pipe(Effect.provideService(Reactivity.Reactivity, reactivity))
    const nestedTransactionUnsupported = SqlError.make({
      reason: UnknownError.make({
        cause: new Error("ClickHouse does not support nested transactions"),
        message: "ClickHouse does not support nested transactions",
        operation: "withTransaction"
      })
    })
    const sql = new Proxy(sqlClient, {
      get: (target, property, receiver) =>
        property === "withTransaction"
          ? <A, E, R>(effect: Effect.Effect<A, E, R>) =>
            Effect.serviceOption(sqlClient.transactionService).pipe(
              Effect.flatMap((activeTransaction) =>
                activeTransaction._tag === "Some" ? nestedTransactionUnsupported : sqlClient.withTransaction(effect)
              )
            )
          : Reflect.get(target, property, receiver)
    })

    return ClickHouseNativeSqlClient.of({
      execute: (sql: string) => pool.execute(sql).pipe(Effect.provideService(Crypto.Crypto, crypto)),
      ping: pool.ping.pipe(Effect.provideService(Crypto.Crypto, crypto)),
      sql
    })
  })

export const layer = (
  config: ClickHouseConfig,
  options: ClickHouseNativeSqlClientOptions
): Layer.Layer<ClickHouseNativeSqlClient | SqlClient.SqlClient, SqlError, Crypto.Crypto> =>
  make(config, options).pipe(
    Effect.map((client) =>
      Context.make(ClickHouseNativeSqlClient, client).pipe(Context.add(SqlClient.SqlClient, client.sql))
    ),
    Layer.effectContext
  )

export const withClickHouseNativeSqlClient = <A, E, R>(
  config: ClickHouseConfig,
  options: ClickHouseNativeSqlClientOptions,
  use: (client: IClickHouseNativeSqlClient) => Effect.Effect<A, E, R>
): Effect.Effect<
  A,
  E | SqlError,
  Crypto.Crypto | R
> => make(config, options).pipe(Effect.flatMap(use), Effect.scoped)
