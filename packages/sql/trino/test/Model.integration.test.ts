import { assert, describe, it } from "@effect/vitest"
import { BigDecimal, DateTime, Effect, Schema } from "effect"
import { Model } from "effect/schema"
import { SqlClient, SqlModel, SqlResolver, SqlSchema } from "effect/sql"
import { layerClientIn, layerTimeout } from "./utils.ts"

const timeout = 60_000

// A zone other than the server's: instants must survive it.
const berlin = { timeZone: "Europe/Berlin" }

const table = (name: string) => `memory.default.${name}_${crypto.randomUUID().replaceAll("-", "")}`

// Trino has no RETURNING, so `SqlModel`'s `insert` and `update` cannot run:
// the repositories below use `insertVoid` and `findById`.
describe("Model, SqlSchema and SqlResolver on the default decoding", () => {
  it.layer(layerClientIn("default", berlin), { timeout: layerTimeout, excludeTestServices: true })(
    "TrinoClient with Model",
    (it) => {
      it.effect("round trips Model.DateTimeInsertFromDate through a repository", () =>
        Effect.gen(function*() {
          class Entry extends Model.Class<Entry>("Entry")({
            id: Schema.BigInt,
            created_at: Model.DateTimeInsertFromDate
          }) {}

          const sql = yield* SqlClient.SqlClient
          const tableName = table("model_timestamp")
          yield* sql`CREATE TABLE ${sql(tableName)} (id bigint, created_at timestamp(3) with time zone)`
          const repo = yield* SqlModel.makeRepository(Entry, {
            tableName,
            idColumn: "id",
            spanPrefix: "EntryRepository"
          })
          const instant = new Date("2024-05-06T07:08:09.123Z")
          yield* repo.insertVoid(
            Entry.insert.make({ id: 1n, created_at: Model.Override(DateTime.makeUnsafe(instant)) })
          )
          const selected = yield* repo.findById(1n)
          assert.strictEqual(selected.id, 1n)
          assert.strictEqual(DateTime.toEpochMillis(selected.created_at), instant.getTime())
        }), timeout)

      class Trade extends Model.Class<Trade>("Trade")({
        id: Schema.BigInt,
        price: Schema.BigDecimalFromString,
        traded_on: Model.Date,
        executed_at: Model.DateTimeInsertFromDate
      }) {}

      const seed = Effect.fnUntraced(function*() {
        const sql = yield* SqlClient.SqlClient
        const tableName = table("model_trades")
        yield* sql`CREATE TABLE ${
          sql(tableName)
        } (id bigint, price decimal(10, 2), traded_on date, executed_at timestamp(3))`
        yield* sql`INSERT INTO ${sql(tableName)} VALUES
          (1, DECIMAL '12.30', DATE '2026-11-12', TIMESTAMP '2026-11-12 10:00:00.123'),
          (2, DECIMAL '-0.05', DATE '2026-11-13', TIMESTAMP '2026-11-13 23:59:59.999')`
        return tableName
      })

      const assertFirstTrade = (trade: Trade) => {
        assert.strictEqual(trade.id, 1n)
        assert.isTrue(BigDecimal.equals(trade.price, BigDecimal.fromStringUnsafe("12.30")))
        assert.strictEqual(DateTime.formatIsoDate(trade.traded_on), "2026-11-12")
        assert.strictEqual(DateTime.toEpochMillis(trade.executed_at), Date.UTC(2026, 10, 12, 10, 0, 0, 123))
      }

      it.effect("decodes decimal, date and timestamp columns with Model fields", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          const tableName = yield* seed()
          const repo = yield* SqlModel.makeRepository(Trade, {
            tableName,
            idColumn: "id",
            spanPrefix: "TradeRepository"
          })
          assertFirstTrade(yield* repo.findById(1n))

          const byDay = SqlSchema.findAll({
            Request: Schema.String,
            Result: Trade,
            execute: (day) => sql`SELECT * FROM ${sql(tableName)} WHERE traded_on = CAST(${day} AS date) ORDER BY id`
          })
          const [second] = yield* byDay("2026-11-13")
          assert.isTrue(BigDecimal.equals(second.price, BigDecimal.fromStringUnsafe("-0.05")))
          assert.strictEqual(DateTime.toEpochMillis(second.executed_at), Date.UTC(2026, 10, 13, 23, 59, 59, 999))
        }), timeout)

      it.effect("batches SqlResolver.findById requests", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          const tableName = yield* seed()
          const TradeById = SqlResolver.findById({
            Id: Schema.BigInt,
            Result: Trade,
            ResultId: (trade) => trade.id,
            execute: (ids) => sql`SELECT * FROM ${sql(tableName)} WHERE ${sql.in("id", ids)}`
          })
          const [first, second] = yield* Effect.all([
            SqlResolver.request(1n, TradeById),
            SqlResolver.request(2n, TradeById)
          ], { concurrency: "unbounded" })
          assertFirstTrade(first)
          assert.strictEqual(second.id, 2n)
        }), timeout)
    }
  )
})

describe("the types registry", () => {
  it.layer(layerClientIn("effect", berlin), { timeout: layerTimeout, excludeTestServices: true })(
    "Effect types",
    (it) => {
      it.effect("decodes with the self schemas of the Effect types", () =>
        Effect.gen(function*() {
          const sql = yield* SqlClient.SqlClient
          const Row = Schema.Struct({
            price: Schema.BigDecimal,
            traded_on: Schema.DateTimeUtc,
            executed_at: Schema.DateTimeUtc,
            executed_tz: Schema.DateTimeZoned
          })
          const find = SqlSchema.findOne({
            Request: Schema.Void,
            Result: Row,
            execute: () =>
              sql`SELECT DECIMAL '12.30' AS price, DATE '2026-11-12' AS traded_on,
                TIMESTAMP '2026-11-12 10:00:00.123' AS executed_at,
                TIMESTAMP '2026-11-12 10:00:00.123 Europe/Dublin' AS executed_tz`
          })
          const row = yield* find()
          assert.isTrue(BigDecimal.equals(row.price, BigDecimal.fromStringUnsafe("12.30")))
          assert.strictEqual(DateTime.formatIsoDate(row.traded_on), "2026-11-12")
          assert.strictEqual(DateTime.toEpochMillis(row.executed_at), Date.UTC(2026, 10, 12, 10, 0, 0, 123))
          assert.strictEqual(DateTime.zoneToString(row.executed_tz.zone), "Europe/Dublin")
        }), timeout)
    }
  )
})
