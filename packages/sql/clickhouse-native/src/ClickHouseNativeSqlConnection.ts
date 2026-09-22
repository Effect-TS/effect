import type { Connection } from "effect/sql/SqlConnection"
import type { SqlError } from "effect/sql/SqlError"

import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Statement from "effect/sql/Statement"
import * as Stream from "effect/Stream"

import type { ClickHouseNativeClient } from "./ClickHouseNativeClient.ts"
import type { ClickHouseNativePool } from "./ClickHouseNativePool.ts"

const literal = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "NULL"
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  if (typeof value === "bigint") {
    return value.toString()
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new RangeError("ClickHouse SQL parameters must be finite numbers")
    }
    return value.toString()
  }
  if (value instanceof Date) {
    return `'${value.toISOString().replace(/'/g, "\\'")}'`
  }
  if (Array.isArray(value)) {
    return `[${value.map(literal).join(", ")}]`
  }
  const text = typeof value === "string" ? value : JSON.stringify(value)
  if (text === undefined) {
    return "NULL"
  }
  return `'${text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`
}

/**
 * ClickHouse's Native TCP protocol does not have PostgreSQL-style prepared
 * statements. The compiler therefore renders Effect SQL parameters as escaped
 * ClickHouse literals before the query packet is written.
 */
export const makeCompiler = (): Statement.Compiler =>
  Statement.makeCompiler({
    dialect: "clickhouse",
    onCustom: () => ["", []],
    onIdentifier: Statement.defaultEscape("\""),
    onRecordUpdate: () => ["", []],
    placeholder: (_index, value) => literal(value)
  })

const mapRows = (
  effect: Effect.Effect<ReadonlyArray<Record<string, unknown>>, SqlError>,
  transformRows: (<A extends object>(rows: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
) =>
  effect.pipe(
    Effect.map((rows) => transformRows === undefined ? rows : transformRows(rows))
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
  query: (sql: string) => Effect.Effect<
    ReadonlyArray<Record<string, unknown>>,
    SqlError
  >
): Connection => {
  const execute = (
    sql: string,
    _params: ReadonlyArray<unknown>,
    transformRows: (<A extends object>(rows: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined
  ) => mapRows(query(sql), transformRows)

  return {
    execute,
    executeRaw: (sql, _params) => mapRows(query(sql), undefined),
    executeStream: (sql, params, transformRows) =>
      execute(sql, params, transformRows).pipe(
        Stream.fromEffect,
        Stream.flatMap(Stream.fromIterable)
      ),
    executeUnprepared: execute,
    executeValues: (sql, _params) =>
      mapRows(query(sql), undefined).pipe(
        Effect.map((rows) => rows.map((row) => Object.values(row)))
      ),
    executeValuesUnprepared: (sql, _params) =>
      mapRows(query(sql), undefined).pipe(
        Effect.map((rows) => rows.map((row) => Object.values(row)))
      )
  }
}

/** A statement-scoped connection which borrows from the pool for each query. */
export const makeConnection = (pool: ClickHouseNativePool, crypto: Crypto.Crypto): Connection =>
  makeConnectionFromQuery((sql) => pool.execute(sql).pipe(Effect.provideService(Crypto.Crypto, crypto)))

/**
 * A connection pinned to one Native TCP socket. It is used only for an
 * explicit ClickHouse transaction, as transaction state belongs to the socket.
 */
export const makeReservedConnection = (client: ClickHouseNativeClient, crypto: Crypto.Crypto): Connection =>
  makeConnectionFromQuery((sql) => client.execute(sql).pipe(Effect.provideService(Crypto.Crypto, crypto)))
