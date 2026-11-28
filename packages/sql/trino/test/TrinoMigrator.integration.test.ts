import { TrinoMigrator } from "@effect/sql-trino"
import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import * as SqlClient from "effect/sql/SqlClient"
import { TrinoContainer } from "./utils.ts"

// The memory catalog rejects writes inside an explicit transaction, so these
// migrations only succeed when the migrator runs without one.
it.layer(TrinoContainer.layerClient, { timeout: "120 seconds", excludeTestServices: true })(
  "TrinoMigrator (integration)",
  (it) => {
    it.effect("records each migration with its creation time and skips it on the next run", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const loader = TrinoMigrator.fromRecord({
          "1_create_people": sql`CREATE TABLE people (id bigint, name varchar)`,
          "2_insert_people": sql`INSERT INTO people VALUES (1, 'Ada')`
        })
        const startedAt = Date.now()

        const first = yield* TrinoMigrator.run({ loader })
        const second = yield* TrinoMigrator.run({ loader })

        assert.deepStrictEqual(first, [[1, "create_people"], [2, "insert_people"]])
        assert.deepStrictEqual(second, [])
        const recorded = yield* sql<{ migration_id: number; name: string; created_at: Date }>`
          SELECT migration_id, name, created_at FROM effect_sql_migrations ORDER BY migration_id`
        assert.deepStrictEqual(recorded.map((row) => [row.migration_id, row.name]), [
          [1, "create_people"],
          [2, "insert_people"]
        ])
        for (const { created_at } of recorded) {
          assert.instanceOf(created_at, Date)
          assert.isAtLeast(created_at.getTime(), startedAt)
          assert.isAtMost(created_at.getTime(), Date.now())
        }
      }))
  }
)
