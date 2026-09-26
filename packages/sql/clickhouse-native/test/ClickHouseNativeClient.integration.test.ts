import { NodeCrypto } from "@effect/platform-node"
import { it } from "@effect/vitest"
import { Effect, Result } from "effect"
import { isSqlError } from "effect/sql/SqlError"
import { describe, expect } from "vitest"

import { withClickHouseNative } from "@effect/sql-clickhouse-native/ClickHouseNativeClient"
import { clickHouseConfig } from "@effect/sql-clickhouse-native/ClickHouseNativeConfig"

const whenNativeIntegration = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  clickHouseConfig.pipe(Effect.flatMap((config) => config.nativeIntegration ? effect : Effect.void))

describe("ClickHouse native TCP client", () => {
  it.effect("authenticates, pings, and decodes a Native result block", () =>
    whenNativeIntegration(
      Effect.gen(function*() {
        const config = yield* clickHouseConfig
        yield* withClickHouseNative(config, (client) =>
          Effect.gen(function*() {
            yield* client.ping
            const rows = yield* client.execute(
              "SELECT 1 AS unsigned_value, -2 AS signed_value, 3.5 AS float_value, 'ok' AS string_value, NULL::Nullable(String) AS nullable_value"
            )
            expect(rows).toEqual([{
              float_value: 3.5,
              nullable_value: null,
              signed_value: -2,
              string_value: "ok",
              unsigned_value: 1
            }])
          }))
      }).pipe(
        Effect.provide(NodeCrypto.layer)
      )
    ))

  it.effect("maps a ClickHouse server exception to SqlError", () =>
    whenNativeIntegration(
      Effect.gen(function*() {
        const config = yield* clickHouseConfig
        yield* withClickHouseNative(config, (client) =>
          client.execute("SELECT throwIf(1, 'native-driver-test')").pipe(
            Effect.result,
            Effect.tap((result) =>
              Effect.sync(() => {
                expect(Result.isFailure(result)).toBe(true)
                if (Result.isFailure(result)) {
                  expect(isSqlError(result.failure)).toBe(true)
                  expect(result.failure.message).toContain("native-driver-test")
                }
              })
            )
          ))
      }).pipe(
        Effect.provide(NodeCrypto.layer)
      )
    ))

  it.effect("returns totals, extremes, and execution metadata", () =>
    whenNativeIntegration(
      Effect.gen(function*() {
        const config = yield* clickHouseConfig
        yield* withClickHouseNative(config, (client) =>
          client.executeWithResult(
            "SELECT number % 2 AS key, count() AS count FROM numbers(3) GROUP BY key WITH TOTALS ORDER BY key SETTINGS extremes = 1, send_profile_events = 1"
          ).pipe(
            Effect.tap((result) =>
              Effect.sync(() => {
                expect(result.rows).toEqual([{ count: 2, key: 0 }, { count: 1, key: 1 }])
                expect(result.totals).toEqual([{ count: 3, key: 0 }])
                expect(result.extremes).toEqual([{ count: 1, key: 0 }, { count: 2, key: 1 }])
                expect(result.progress.length).toBeGreaterThan(0)
                expect(result.profileInfo.length).toBeGreaterThan(0)
                expect(result.profileEvents.length).toBeGreaterThan(0)
              })
            )
          ))
      }).pipe(
        Effect.provide(NodeCrypto.layer)
      )
    ))

  it.effect("preserves the server timezone through a revision-54464 session", () =>
    whenNativeIntegration(
      Effect.gen(function*() {
        const config = yield* clickHouseConfig
        yield* withClickHouseNative(config, (client) =>
          Effect.gen(function*() {
            yield* client.execute(
              "CREATE TEMPORARY TABLE native_timezone_update (value UInt8) ENGINE = Memory"
            )
            yield* client.execute("SET session_timezone = 'Asia/Tehran'")
            const configuredTimezone = yield* client.execute("SELECT getSetting('session_timezone') AS timezone")
            yield* Effect.sync(() => {
              expect(configuredTimezone).toEqual([{ timezone: "Asia/Tehran" }])
            })
            yield* client.insert(
              "INSERT INTO native_timezone_update VALUES",
              [{ value: 1 }]
            )
            const serverTimezone = yield* client.serverTimezone
            yield* Effect.sync(() => {
              expect(serverTimezone).toBe("UTC")
            })
          }))
      }).pipe(
        Effect.provide(NodeCrypto.layer)
      )
    ))
})
