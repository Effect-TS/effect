import { assert, it } from "@effect/vitest"
import { Effect } from "effect"
import * as SqlClient from "effect/sql/SqlClient"
import { TrinoContainer } from "./utils.ts"

it.layer(TrinoContainer.layerClient, { timeout: "120 seconds", excludeTestServices: true })(
  "TrinoClient (integration)",
  (it) => {
    it.effect("reads a result that spans several pages", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const rows = yield* sql<{ orderkey: bigint }>`SELECT orderkey FROM tpch.tiny.orders`

        assert.lengthOf(rows, 15000)
      }))

    it.effect("round-trips parameters without losing precision", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const at = new Date("2024-01-15T14:30:00.123Z")

        const rows = yield* sql`SELECT ${9007199254740993n} AS id, ${at} AS at, ${"it's"} AS name`

        assert.deepStrictEqual(rows, [{ id: 9007199254740993n, at, name: "it's" }])
      }))

    it.effect("matches no rows for an empty IN list", () =>
      Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient

        const rows = yield* sql`SELECT nationkey FROM tpch.tiny.nation WHERE nationkey IN ${sql.in([])}`

        assert.deepStrictEqual(rows, [])
      }))
  }
)
