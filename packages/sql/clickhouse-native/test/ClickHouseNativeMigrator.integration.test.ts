import { NodeCrypto } from "@effect/platform-node"
import { it } from "@effect/vitest"
import { Effect } from "effect"
import { describe, expect } from "vitest"

import { clickhouseConfig } from "../src/ClickHouseNativeConfig.ts"
import { run } from "../src/ClickHouseNativeMigrator.ts"
import { ClickHouseNativeSqlClient, withClickHouseNativeSqlClient } from "../src/ClickHouseNativeSqlClient.ts"

const whenNativeIntegration = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  clickhouseConfig.pipe(Effect.flatMap((config) => config.nativeIntegration ? effect : Effect.void))

const migrationsTable = "market.effect_native_migrator_test"
const targetTable = "market.effect_native_migrator_target"

describe("ClickHouse native migrator integration", () => {
  it.effect("records an immutable migration and does not run it twice", () =>
    whenNativeIntegration(
      Effect.gen(function*() {
        const config = yield* clickhouseConfig
        yield* withClickHouseNativeSqlClient(config, { poolSize: 1 }, (client) =>
          Effect.gen(function*() {
            yield* client.execute(`DROP TABLE IF EXISTS ${migrationsTable}`)
            yield* client.execute(`DROP TABLE IF EXISTS ${targetTable}`)
            const migrations = [{
              id: 1,
              name: "create_target",
              statements: [`CREATE TABLE ${targetTable} (id UInt64) ENGINE = Memory`]
            }] as const
            const first = yield* run({ migrations, table: migrationsTable }).pipe(
              Effect.provideService(ClickHouseNativeSqlClient, client)
            )
            const second = yield* run({ migrations, table: migrationsTable }).pipe(
              Effect.provideService(ClickHouseNativeSqlClient, client)
            )
            const applied = yield* client.execute(`SELECT migration_id, name FROM ${migrationsTable}`)
            yield* client.execute(`DROP TABLE ${targetTable}`)
            yield* client.execute(`DROP TABLE ${migrationsTable}`)

            expect(first).toEqual([[1, "create_target"]])
            expect(second).toEqual([])
            expect(applied).toEqual([{ migration_id: 1, name: "create_target" }])
          }))
      }).pipe(
        // @effect-diagnostics-next-line strictEffectProvide:off
        Effect.provide(NodeCrypto.layer)
      )
    ))
})
