import { it } from "@effect/vitest"
import { Effect, Result } from "effect"
import { isSqlError } from "effect/sql/SqlError"
import { describe, expect } from "vitest"

import { run } from "@effect/sql-clickhouse-native/ClickHouseNativeMigrator"
import { ClickHouseNativeSqlClient } from "@effect/sql-clickhouse-native/ClickHouseNativeSqlClient"

const client = ClickHouseNativeSqlClient.of({
  execute: () => Effect.die("The client must not run when migrations are invalid"),
  ping: Effect.void
} as never)

describe("ClickHouse native migrator", () => {
  it.effect("rejects duplicate immutable migration ids before executing SQL", () =>
    run({
      migrations: [
        { id: 1, name: "first", statements: [] },
        { id: 1, name: "duplicate", statements: [] }
      ]
    }).pipe(
      Effect.provideService(ClickHouseNativeSqlClient, client),
      Effect.result,
      Effect.tap((result) =>
        Effect.sync(() => {
          expect(Result.isFailure(result)).toBe(true)
          if (Result.isFailure(result)) {
            expect(isSqlError(result.failure)).toBe(true)
            if (isSqlError(result.failure)) {
              expect(result.failure.reason._tag).toBe("UniqueViolation")
            }
          }
        })
      )
    ))

  it.effect("sorts migrations without mutating the caller-owned array", () =>
    Effect.gen(function*() {
      const migrations = Object.freeze([
        Object.freeze({ id: 2, name: "second", statements: Object.freeze([]) }),
        Object.freeze({ id: 1, name: "first", statements: Object.freeze([]) })
      ])
      const successfulClient = ClickHouseNativeSqlClient.of({
        execute: () => Effect.succeed([]),
        ping: Effect.void
      } as never)

      yield* run({ migrations }).pipe(Effect.provideService(ClickHouseNativeSqlClient, successfulClient))

      expect(migrations.map((migration) => migration.id)).toEqual([2, 1])
    }))
})
