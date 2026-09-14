import { assert, it } from "@effect/vitest"
import { DateTime, Effect, Schema } from "effect"
import { Model } from "effect/unstable/schema"
import { SqlClient, SqlModel } from "effect/unstable/sql"
import { PgContainer } from "./utils.ts"

class Event extends Model.Class<Event>("Event")({
  id: Schema.Int.pipe(Model.FieldExcept(["insert"])),
  createdAt: Model.DateTimeInsertFromNumber
}) {}

it.layer(PgContainer.layerClient, { timeout: "30 seconds" })("SqlModel", (it) => {
  for (const columnType of ["timestamp", "timestamptz"] as const) {
    it.effect(`inserts DateTimeInsertFromNumber into ${columnType} without casts`, () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const tableName = `model_insert_${columnType}`
        yield* sql`CREATE TABLE ${sql(tableName)} (id SERIAL PRIMARY KEY, "createdAt" ${
          sql.literal(columnType)
        } NOT NULL)`
        const repo = yield* SqlModel.makeRepository(Event, {
          tableName,
          idColumn: "id",
          spanPrefix: "EventRepository"
        })

        const now = yield* DateTime.now
        for (const millis of [DateTime.toEpochMillis(now), 1714979289123, -1234]) {
          const input = yield* Event.insert.makeEffect(
            millis === DateTime.toEpochMillis(now) ? {} : { createdAt: Model.Override(DateTime.makeUnsafe(millis)) }
          )
          const event = yield* repo.insert(input)
          assert.strictEqual(DateTime.toEpochMillis(event.createdAt), millis)
          const rows = yield* sql<{ createdAt: number }>`SELECT "createdAt" FROM ${
            sql(tableName)
          } WHERE id = ${event.id}`
          assert.deepStrictEqual(rows, [{ createdAt: millis }])
          assert.deepStrictEqual(yield* repo.findById(event.id), event)
        }
      }))
  }
})
