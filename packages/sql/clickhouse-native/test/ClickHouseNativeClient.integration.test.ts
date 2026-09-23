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
})
