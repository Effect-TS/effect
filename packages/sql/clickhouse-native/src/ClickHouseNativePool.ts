import type { Crypto, Scope } from "effect"

import * as Effect from "effect/Effect"
import * as Pool from "effect/Pool"
import { SqlError, UnknownError } from "effect/sql/SqlError"

import type { ClickHouseNativeClient } from "./ClickHouseNativeClient.ts"
import type { ClickHouseConfig } from "./ClickHouseNativeConfig.ts"

import { makeClickHouseNativeClient } from "./ClickHouseNativeClient.ts"

export interface ClickHouseNativePool {
  readonly execute: (
    sql: string
  ) => Effect.Effect<
    ReadonlyArray<Record<string, unknown>>,
    SqlError,
    Crypto.Crypto
  >
  readonly insert: (
    sql: string,
    rows: ReadonlyArray<Record<string, unknown>>
  ) => Effect.Effect<void, SqlError, Crypto.Crypto>
  readonly ping: Effect.Effect<void, SqlError>
  /**
   * Leases a physical Native TCP connection until its surrounding Scope closes.
   * This is used by transactions, whose statements must all use one socket.
   */
  readonly reserve: Effect.Effect<
    ClickHouseNativeClient,
    SqlError,
    Scope.Scope
  >
}

const invalidPoolSize = (size: number): SqlError =>
  SqlError.make({
    reason: UnknownError.make({
      cause: new RangeError(`ClickHouse native pool size must be a positive safe integer, received ${size}`),
      message: `ClickHouse native pool size must be a positive safe integer, received ${size}`,
      operation: "pool.make"
    })
  })

export const makeClickHouseNativePool = (
  config: ClickHouseConfig,
  options: { readonly size: number }
): Effect.Effect<ClickHouseNativePool, SqlError, Scope.Scope> =>
  Number.isSafeInteger(options.size) && options.size > 0
    ? Pool.make({ acquire: makeClickHouseNativeClient(config), size: options.size }).pipe(
      Effect.map((pool) => ({
        execute: (sql: string) => Pool.use(pool, (client: ClickHouseNativeClient) => client.execute(sql)),
        insert: (sql: string, rows: ReadonlyArray<Record<string, unknown>>) =>
          Pool.use(pool, (client: ClickHouseNativeClient) => client.insert(sql, rows)),
        ping: Pool.use(pool, (client: ClickHouseNativeClient) => client.ping),
        reserve: Pool.get(pool)
      }))
    )
    : invalidPoolSize(options.size)

export const withClickHouseNativePool = <A, E, R>(
  config: ClickHouseConfig,
  options: { readonly size: number },
  use: (pool: ClickHouseNativePool) => Effect.Effect<A, E, R>
): Effect.Effect<A, E | SqlError, Crypto.Crypto | R> =>
  makeClickHouseNativePool(config, options).pipe(Effect.flatMap(use), Effect.scoped)
