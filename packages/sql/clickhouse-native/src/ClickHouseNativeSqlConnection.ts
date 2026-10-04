import type { Connection } from "effect/sql/SqlConnection"
import type { SqlError } from "effect/sql/SqlError"

import * as Array from "effect/Array"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Statement from "effect/sql/Statement"
import * as Stream from "effect/Stream"

import type { ClickHouseNativeClient } from "./ClickHouseNativeClient.ts"
import type { ClickHouseNativePool } from "./ClickHouseNativePool.ts"

const parameterType = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "Nullable(String)"
  }
  if (value instanceof Date) {
    return "DateTime64(3, 'UTC')"
  }
  if (Array.isArray(value)) {
    return `Array(${value.length === 0 ? "String" : parameterType(value[0])})`
  }
  if (typeof value === "boolean") {
    return "Bool"
  }
  if (typeof value === "bigint") {
    return "Int64"
  }
  if (typeof value === "number") {
    return "Float64"
  }

  return "String"
}

/**
 * ClickHouse's Native TCP protocol does not have PostgreSQL-style prepared
 * statements. The compiler emits typed ClickHouse placeholders while the
 * Native client transmits their values in the query parameter packet.
 */
export const makeCompiler = (): Statement.Compiler =>
  Statement.makeCompiler({
    dialect: "clickhouse",
    onCustom: () => ["", []],
    onIdentifier: Statement.defaultEscape("\""),
    onRecordUpdate: () => ["", []],
    placeholder: (index, value) => `{p${index}: ${parameterType(value)}}`
  })

const mapRows = (
  effect: Effect.Effect<ReadonlyArray<Record<string, unknown>>, SqlError>,
  transformRows: (<A extends object>(rows: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
) =>
  effect.pipe(
    Effect.map((rows) => transformRows?.(rows) ?? rows)
  )

/**
 * A pooled, statement-scoped Native TCP connection for Effect SQL.
 *
 * A ClickHouse Native connection is sequential, so each operation borrows one
 * physical connection from the pool. `executeStream` is intentionally a
 * buffered stream until the Native packet reader gains incremental block
 * delivery.
 */
const makeConnectionFromQuery = (
  query: (sql: string, parameters: ReadonlyArray<unknown>) => Effect.Effect<
    ReadonlyArray<Record<string, unknown>>,
    SqlError
  >
): Connection => {
  const execute = (
    sql: string,
    parameters: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(rows: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) => mapRows(query(sql, parameters), transformRows)

  return {
    execute,
    executeRaw: (sql, parameters) => mapRows(query(sql, parameters), undefined),
    executeStream: (sql, parameters, transformRows) =>
      execute(sql, parameters, transformRows).pipe(
        Stream.fromEffect,
        Stream.flatMap(Stream.fromIterable)
      ),
    executeUnprepared: execute,
    executeValues: (sql, parameters) =>
      mapRows(query(sql, parameters), undefined).pipe(
        Effect.map(Array.map(Object.values))
      ),
    executeValuesUnprepared: (sql, parameters) =>
      mapRows(query(sql, parameters), undefined).pipe(
        Effect.map(Array.map(Object.values))
      )
  }
}

/** A statement-scoped connection which borrows from the pool for each query. */
export const makeConnection = (pool: ClickHouseNativePool, crypto: Crypto.Crypto): Connection =>
  makeConnectionFromQuery((sql, parameters) =>
    pool.execute(sql, parameters).pipe(Effect.provideService(Crypto.Crypto, crypto))
  )

/**
 * A connection pinned to one Native TCP socket. It is used only for an
 * explicit ClickHouse transaction, as transaction state belongs to the socket.
 */
export const makeReservedConnection = (client: ClickHouseNativeClient, crypto: Crypto.Crypto): Connection =>
  makeConnectionFromQuery((sql, parameters) =>
    client.execute(sql, parameters).pipe(Effect.provideService(Crypto.Crypto, crypto))
  )
