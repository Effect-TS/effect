import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import * as ClickhouseClient from "effect/clickhouse/ClickhouseClient"
import * as ClickhouseMigrator from "effect/clickhouse/ClickhouseMigrator"
import { HttpClient, HttpClientResponse } from "effect/http"
import * as Reactivity from "effect/reactivity/Reactivity"
import * as SqlClient from "effect/sql/SqlClient"

const fixture = Effect.fnUntraced(function*() {
  const operations: Array<string> = []
  const history: Array<{ migration_id: number; name: string }> = []
  const http = HttpClient.make((request, url) =>
    Effect.gen(function*() {
      if (url.pathname.endsWith("/ping")) return HttpClientResponse.fromWeb(request, new Response("Ok."))
      const query = url.searchParams.get("query") ??
        (request.body._tag === "Uint8Array" ? new TextDecoder().decode(request.body.body) : "")
      operations.push(query)
      if (request.body._tag === "Stream") {
        const text = (yield* Stream.runCollect(request.body.stream.pipe(Stream.decodeText())).pipe(Effect.orDie)).join(
          ""
        )
        history.push(...text.trim().split("\n").map((line) => JSON.parse(line)))
      }
      return HttpClientResponse.fromWeb(
        request,
        new Response(
          url.searchParams.has("default_format")
            ? JSON.stringify({ meta: [], data: history, rows: history.length })
            : ""
        )
      )
    })
  )
  const sql = yield* ClickhouseClient.make({}).pipe(
    Effect.provideService(HttpClient.HttpClient, http),
    Effect.provide(Reactivity.layer)
  )
  const run = <R>(options: ClickhouseMigrator.MigratorOptions<R>) =>
    ClickhouseMigrator.run(options).pipe(
      Effect.provideService(ClickhouseClient.ClickhouseClient, sql),
      Effect.provideService(SqlClient.SqlClient, sql)
    )
  return { operations, history, sql, run }
})

describe("native ClickHouse migrations", () => {
  it.effect("creates a MergeTree table and records only successfully applied migrations", () =>
    Effect.gen(function*() {
      const f = yield* fixture()
      const loader = Effect.succeed(
        [
          [2, "second", Effect.succeed(f.sql.asCommand(f.sql`ALTER TABLE example ADD COLUMN second UInt8`))],
          [1, "first", Effect.succeed({ default: f.sql.asCommand(f.sql`ALTER TABLE example ADD COLUMN first UInt8`) })]
        ] as const
      )
      assert.deepStrictEqual(yield* f.run({ loader }), [[1, "first"], [2, "second"]])
      assert.include(f.operations[0], "ENGINE = MergeTree ORDER BY migration_id")
      assert.deepStrictEqual(f.history, [{ migration_id: 1, name: "first" }, { migration_id: 2, name: "second" }])
      assert.strictEqual(f.operations.some((sql) => sql.startsWith("BEGIN")), false)
      assert.deepStrictEqual(yield* f.run({ loader }), [])
    }))

  it.effect("leaves failed migrations unrecorded", () =>
    Effect.gen(function*() {
      const f = yield* fixture()
      const loader = Effect.succeed(
        [
          [1, "first", Effect.succeed(Effect.void)],
          [2, "failed", Effect.succeed(Effect.fail("migration failure"))]
        ] as const
      )
      assert.strictEqual((yield* Effect.flip(f.run({ loader })))._tag, "MigrationError")
      assert.deepStrictEqual(f.history, [{ migration_id: 1, name: "first" }])
    }))

  it.effect("rejects duplicate IDs, invalid modules and unsupported schema dumps", () =>
    Effect.gen(function*() {
      const f = yield* fixture()
      const duplicates = yield* Effect.flip(
        f.run({
          loader: Effect.succeed([[1, "first", Effect.succeed(Effect.void)], [
            1,
            "duplicate",
            Effect.succeed(Effect.void)
          ]])
        })
      )
      assert.strictEqual(duplicates._tag, "MigrationError")
      if (duplicates._tag === "MigrationError") assert.strictEqual(duplicates.kind, "Duplicates")
      const module = yield* Effect.flip(f.run({ loader: Effect.succeed([[1, "invalid", Effect.succeed({})]]) }))
      assert.strictEqual(module._tag, "MigrationError")
      if (module._tag === "MigrationError") assert.strictEqual(module.kind, "ImportError")
      const dump = yield* Effect.flip(f.run({ loader: Effect.succeed([]), schemaDirectory: "schema" }))
      assert.strictEqual(dump._tag, "MigrationError")
      if (dump._tag === "MigrationError") assert.strictEqual(dump.kind, "BadState")
    }))
})
