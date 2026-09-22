import { NodeCrypto } from "@effect/platform-node"
import { it } from "@effect/vitest"
import { Effect, Result } from "effect"
import { isSqlError } from "effect/sql/SqlError"
import { describe, expect } from "vitest"

import { clickhouseConfig } from "../src/ClickHouseNativeConfig.ts"
import { makeClickHouseNativePool, withClickHouseNativePool } from "../src/ClickHouseNativePool.ts"

const whenNativeIntegration = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  clickhouseConfig.pipe(Effect.flatMap((config) => config.nativeIntegration ? effect : Effect.void))

describe("ClickHouse native TCP pool", () => {
  it.effect("rejects a non-positive pool size", () =>
    Effect.gen(function*() {
      return yield* makeClickHouseNativePool(yield* clickhouseConfig, { size: 0 })
    }).pipe(
      Effect.result,
      Effect.tap((result) =>
        Effect.sync(() => {
          expect(Result.isFailure(result)).toBe(true)
          if (Result.isFailure(result)) {
            expect(isSqlError(result.failure)).toBe(true)
            if (isSqlError(result.failure)) {
              expect(result.failure.reason._tag).toBe("UnknownError")
            }
          }
        })
      )
    ))
})

describe("ClickHouse native TCP pool integration", () => {
  it.effect("leases distinct connections for concurrent Effect.all queries", () =>
    whenNativeIntegration(
      Effect.gen(function*() {
        const config = yield* clickhouseConfig
        return yield* withClickHouseNativePool(config, { size: 2 }, (pool) =>
          Effect.all(
            [
              pool.execute("SELECT sleep(0.05) AS waited, 'first' AS value"),
              pool.execute("SELECT sleep(0.05) AS waited, 'second' AS value")
            ],
            { concurrency: "unbounded", discard: false }
          ).pipe(
            Effect.tap((rows) =>
              Effect.sync(() => {
                expect(rows).toEqual([
                  [{ value: "first", waited: 0 }],
                  [{ value: "second", waited: 0 }]
                ])
              })
            )
          ))
      }).pipe(
        // @effect-diagnostics-next-line strictEffectProvide:off
        Effect.provide(NodeCrypto.layer)
      )
    ))

  it.effect("leases connections for concurrent Effect.forEach queries", () =>
    whenNativeIntegration(
      Effect.gen(function*() {
        const config = yield* clickhouseConfig
        return yield* withClickHouseNativePool(config, { size: 2 }, (pool) =>
          Effect.forEach(
            ["one", "two", "three", "four"],
            (value) => pool.execute(`SELECT '${value}' AS value`),
            { concurrency: "unbounded", discard: false }
          ).pipe(
            Effect.tap((rows) =>
              Effect.sync(() => {
                expect(rows).toEqual([
                  [{ value: "one" }],
                  [{ value: "two" }],
                  [{ value: "three" }],
                  [{ value: "four" }]
                ])
              })
            )
          ))
      }).pipe(
        // @effect-diagnostics-next-line strictEffectProvide:off
        Effect.provide(NodeCrypto.layer)
      )
    ))
})
