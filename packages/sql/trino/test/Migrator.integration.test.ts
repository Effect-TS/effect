import { TrinoClient, TrinoMigrator } from "@effect/sql-trino"
import { assert, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { layerTimeout, TrinoContainer } from "./utils.ts"

// The memory connector takes CREATE TABLE and INSERT but no multi-statement
// transactions, which is the shape the migrator runs in on Trino.
const unique = (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`

const ledger = Effect.fnUntraced(function*(table: string) {
  const sql = yield* SqlClient.SqlClient
  const rows = yield* sql<{ migration_id: number; name: string }>`
    SELECT migration_id, name FROM ${sql(table)} ORDER BY migration_id`
  return rows.map((row) => [row.migration_id, row.name] as const)
})

const timeout = 120_000

it.layer(
  TrinoContainer.layerClientWith({ catalog: "memory", schema: "default" }).pipe(
    Layer.provideMerge(TrinoContainer.layer)
  ),
  { timeout: layerTimeout, excludeTestServices: true }
)("TrinoMigrator", (it) => {
  it.effect(
    "runs pending migrations in order, records them, and runs nothing the second time",
    () =>
      Effect.gen(function*() {
        const sql = yield* TrinoClient.TrinoClient
        const table = unique("migrations")
        const data = unique("people")
        const loader = TrinoMigrator.fromRecord({
          "1_create": sql`CREATE TABLE ${sql(data)} (id bigint, name varchar)`,
          "2_seed": sql`INSERT INTO ${sql(data)} VALUES (1, 'a')`
        })

        const first = yield* TrinoMigrator.run({ loader, table })
        assert.deepStrictEqual(first, [[1, "create"], [2, "seed"]])
        assert.deepStrictEqual(yield* ledger(table), [[1, "create"], [2, "seed"]])

        const second = yield* TrinoMigrator.run({ loader, table })
        assert.deepStrictEqual(second, [])
        const rows = yield* sql<{ id: bigint }>`SELECT id FROM ${sql(data)}`
        assert.deepStrictEqual(rows, [{ id: 1n }])
      }),
    timeout
  )

  it.effect("records only migrations that succeeded and resumes after the failed one", () =>
    Effect.gen(function*() {
      const sql = yield* TrinoClient.TrinoClient
      const table = unique("migrations")
      const data = unique("items")
      const create = sql`CREATE TABLE ${sql(data)} (id bigint)`
      const third = sql`INSERT INTO ${sql(data)} VALUES 3`

      const failed = yield* TrinoMigrator.run({
        table,
        loader: TrinoMigrator.fromRecord({
          "1_create": create,
          "2_insert": sql`INSERT INTO ${sql(unique("missing"))} VALUES 2`,
          "3_insert": third
        })
      }).pipe(Effect.flip)
      assert.strictEqual(failed._tag, "MigrationError")
      assert.deepStrictEqual(yield* ledger(table), [[1, "create"]])

      const resumed = yield* TrinoMigrator.run({
        table,
        loader: TrinoMigrator.fromRecord({
          "1_create": create,
          "2_insert": sql`INSERT INTO ${sql(data)} VALUES 2`,
          "3_insert": third
        })
      })
      assert.deepStrictEqual(resumed, [[2, "insert"], [3, "insert"]])
      const rows = yield* sql<{ id: bigint }>`SELECT id FROM ${sql(data)} ORDER BY id`
      assert.deepStrictEqual(rows, [{ id: 2n }, { id: 3n }])
    }), timeout)
})
