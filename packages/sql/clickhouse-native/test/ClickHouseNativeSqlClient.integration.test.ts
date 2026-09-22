import { NodeCrypto } from "@effect/platform-node"
import { it } from "@effect/vitest"
import { Effect, Layer, Result } from "effect"
import { SqlClient } from "effect/unstable/sql"
import { SqlError } from "effect/unstable/sql/SqlError"
import { describe, expect } from "vitest"

import { clickhouseConfig } from "../src/ClickHouseNativeConfig.js"
import {
  ClickHouseNativeSqlClient,
  layer,
  make,
  withClickHouseNativeSqlClient
} from "../src/ClickHouseNativeSqlClient.js"

const whenNativeIntegration = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  clickhouseConfig.pipe(Effect.flatMap((config) => config.nativeIntegration ? effect : Effect.void))

const whenNativeTransactionIntegration = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  clickhouseConfig.pipe(
    Effect.flatMap((config) => config.nativeIntegration && config.nativeTransactionIntegration ? effect : Effect.void)
  )

describe("ClickHouse native SQL client service", () => {
  it.effect("preserves pool-size validation from make", () =>
    Effect.gen(function*() {
      return yield* make(yield* clickhouseConfig, { poolSize: 0 })
    }).pipe(
      Effect.result,
      Effect.tap((result) =>
        Effect.sync(() => {
          expect(Result.isFailure(result)).toBe(true)
          if (Result.isFailure(result)) {
            expect(result.failure).toBeInstanceOf(SqlError)
          }
        })
      ),
      // @effect-diagnostics-next-line strictEffectProvide:off
      Effect.provide(NodeCrypto.layer)
    ))

  it.effect("provides the service through its layer", () =>
    Effect.gen(function*() {
      const config = yield* clickhouseConfig
      return yield* ClickHouseNativeSqlClient.pipe(
        Effect.asVoid,
        // @effect-diagnostics-next-line strictEffectProvide:off
        Effect.provide(layer(config, { poolSize: 0 }).pipe(Layer.provide(NodeCrypto.layer)))
      )
    }).pipe(
      Effect.result,
      Effect.tap((result) =>
        Effect.sync(() => {
          expect(Result.isFailure(result)).toBe(true)
          if (Result.isFailure(result)) {
            expect(result.failure).toBeInstanceOf(SqlError)
          }
        })
      )
    ))
})

describe("ClickHouse native SQL client service integration", () => {
  it.effect("executes through the scoped service layer", () =>
    whenNativeIntegration(Effect.gen(function*() {
      const config = yield* clickhouseConfig
      yield* Effect.gen(function*() {
        const client = yield* ClickHouseNativeSqlClient
        yield* client.ping
        const rows = yield* client.execute("SELECT 'native' AS transport")

        expect(rows).toEqual([{ transport: "native" }])
      }).pipe(
        // @effect-diagnostics-next-line strictEffectProvide:off
        Effect.provide(layer(config, { poolSize: 1 }).pipe(Layer.provide(NodeCrypto.layer)))
      )
    })))

  it.effect("provides generic Effect SQL with safely compiled parameters", () =>
    whenNativeIntegration(Effect.gen(function*() {
      const config = yield* clickhouseConfig
      yield* Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const rows = yield* sql`SELECT ${"native's TCP"} AS transport, ${2} AS value`
        yield* sql`DROP TABLE IF EXISTS market.effect_native_generic_sql_insert_test`
        yield* sql`CREATE TABLE market.effect_native_generic_sql_insert_test (id UInt64, value String) ENGINE = Memory`
        yield* sql`INSERT INTO market.effect_native_generic_sql_insert_test ${sql.insert({ id: 3, value: "generic" })}`
        const inserted = yield* sql`SELECT * FROM market.effect_native_generic_sql_insert_test`
        yield* sql`DROP TABLE market.effect_native_generic_sql_insert_test`

        expect(rows).toEqual([{ transport: "native's TCP", value: 2 }])
        expect(inserted).toEqual([{ id: 3, value: "generic" }])
      }).pipe(
        // @effect-diagnostics-next-line strictEffectProvide:off
        Effect.provide(layer(config, { poolSize: 1 }).pipe(Layer.provide(NodeCrypto.layer)))
      )
    })))

  it.effect("commits, rolls back, and rejects nested transactions on a reserved Native socket", () =>
    whenNativeTransactionIntegration(Effect.gen(function*() {
      const config = yield* clickhouseConfig
      yield* Effect.gen(function*() {
        const client = yield* ClickHouseNativeSqlClient
        const sql = client.sql
        const table = "market.effect_native_sql_client_transaction_test"
        yield* client.execute(`DROP TABLE IF EXISTS ${table}`)
        yield* client.execute(`CREATE TABLE ${table} (id UInt64) ENGINE = MergeTree ORDER BY id`)
        yield* sql.withTransaction(sql`INSERT INTO market.effect_native_sql_client_transaction_test VALUES (${1})`)
        const rollback = yield* sql.withTransaction(
          sql`INSERT INTO market.effect_native_sql_client_transaction_test VALUES (${2})`.pipe(
            Effect.andThen(Effect.fail("rollback"))
          )
        ).pipe(Effect.result)
        const nested = yield* sql.withTransaction(sql.withTransaction(Effect.void)).pipe(Effect.result)
        const rows = yield* client.execute(`SELECT id FROM ${table} ORDER BY id`)
        yield* client.execute(`DROP TABLE ${table}`)

        expect(Result.isFailure(rollback)).toBe(true)
        expect(Result.isFailure(nested)).toBe(true)
        if (Result.isFailure(nested)) {
          expect(nested.failure.reason._tag).toBe("UnknownError")
          expect(nested.failure.reason.operation).toBe("withTransaction")
        }
        expect(rows).toEqual([{ id: 1 }])
      }).pipe(
        // @effect-diagnostics-next-line strictEffectProvide:off
        Effect.provide(layer(config, { poolSize: 2 }).pipe(Layer.provide(NodeCrypto.layer)))
      )
    })))

  it.effect("inserts through the generic SQL service layer", () =>
    whenNativeIntegration(Effect.gen(function*() {
      const config = yield* clickhouseConfig
      yield* Effect.gen(function*() {
        const client = yield* ClickHouseNativeSqlClient
        const sql = client.sql
        yield* client.execute("DROP TABLE IF EXISTS market.effect_native_sql_client_insert_test")
        yield* client.execute(
          "CREATE TABLE market.effect_native_sql_client_insert_test (id UInt64, value String) ENGINE = Memory"
        )
        yield* sql`INSERT INTO market.effect_native_sql_client_insert_test ${
          sql.insert({
            id: 1,
            value: "native"
          })
        }`
        const rows = yield* client.execute("SELECT * FROM market.effect_native_sql_client_insert_test")
        yield* client.execute("DROP TABLE market.effect_native_sql_client_insert_test")

        expect(rows).toEqual([{ id: 1, value: "native" }])
      }).pipe(
        // @effect-diagnostics-next-line strictEffectProvide:off
        Effect.provide(layer(config, { poolSize: 1 }).pipe(Layer.provide(NodeCrypto.layer)))
      )
    })))

  it.effect("executes through the scoped helper", () =>
    whenNativeIntegration(
      Effect.gen(function*() {
        const config = yield* clickhouseConfig
        return yield* withClickHouseNativeSqlClient(config, { poolSize: 1 }, (client) =>
          client.execute("SELECT 1 AS value").pipe(
            Effect.tap((rows) =>
              Effect.sync(() => {
                expect(rows).toEqual([{ value: 1 }])
              })
            )
          ))
      }).pipe(
        // @effect-diagnostics-next-line strictEffectProvide:off
        Effect.provide(NodeCrypto.layer)
      )
    ))
})
