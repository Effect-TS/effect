import { NodeServices } from "@effect/platform-node"
import { MysqlMigrator } from "@effect/sql-mysql"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/unstable/sql"
import { MysqlContainer } from "./utils.ts"

/** Each test migrates its own tables, since they share one database. */
const migrations = (table: string) =>
  MysqlMigrator.fromRecord({
    [`1_create_${table}`]: Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      yield* sql`CREATE TABLE ${sql(table)} (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(64))`
    }),
    [`2_add_colour_to_${table}`]: Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      yield* sql`ALTER TABLE ${sql(table)} ADD COLUMN colour VARCHAR(32)`
    })
  })

describe("MysqlMigrator", () => {
  it.layer(Layer.merge(MysqlContainer.layerClient, NodeServices.layer), { timeout: "120 seconds" })(
    "against a real server",
    (it) => {
      it.effect("applies pending migrations once", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          const applied = yield* MysqlMigrator.run({
            loader: migrations("widgets"),
            table: "widget_migrations"
          })
          assert.deepStrictEqual(applied, [[1, "create_widgets"], [2, "add_colour_to_widgets"]])

          // The migrated schema is really there.
          yield* sql`INSERT INTO widgets ${sql.insert({ name: "cog", colour: "red" })}`
          assert.deepStrictEqual(yield* sql`SELECT name, colour FROM widgets`, [{ name: "cog", colour: "red" }])

          // Running again applies nothing, because the migrations table records
          // what has already been applied.
          const again = yield* MysqlMigrator.run({
            loader: migrations("widgets"),
            table: "widget_migrations"
          })
          assert.deepStrictEqual(again, [])
        }), { timeout: 60_000 })

      it.effect("records applied migrations in its table", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          yield* MysqlMigrator.run({ loader: migrations("gadgets"), table: "gadget_migrations" })
          const rows = yield* sql`SELECT migration_id, name FROM gadget_migrations ORDER BY migration_id`
          assert.deepStrictEqual(rows, [
            { migration_id: 1, name: "create_gadgets" },
            { migration_id: 2, name: "add_colour_to_gadgets" }
          ])
        }), { timeout: 60_000 })
    }
  )
})
