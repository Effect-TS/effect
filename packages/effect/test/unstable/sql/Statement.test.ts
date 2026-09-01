import { assert, describe, it } from "@effect/vitest"
import { Effect, Option, Stream } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import type { Connection } from "effect/unstable/sql/SqlConnection"
import * as Statement from "effect/unstable/sql/Statement"

describe("Statement", () => {
  it("defaultTransforms ignores inherited properties", () => {
    const row = Object.create({ inherited: 1 })
    row.own = 2

    const nested = Statement.defaultTransforms((key) => key.toUpperCase())
    const flat = Statement.defaultTransforms((key) => key.toUpperCase(), false)

    assert.deepStrictEqual(nested.object(row), { OWN: 2 })
    assert.deepStrictEqual(nested.array([row]), [{ OWN: 2 }])
    assert.deepStrictEqual(nested.array([[row]]), [[{ OWN: 2 }]])
    assert.deepStrictEqual(flat.array([row]), [{ OWN: 2 }])
  })

  it("compiles one fragment independently for each compiler", () => {
    const postgres = Statement.makeCompiler({
      dialect: "pg",
      placeholder: (index) => `$${index}`,
      onIdentifier: Statement.defaultEscape("\""),
      onRecordUpdate: () => ["", []],
      onCustom: () => ["", []]
    })
    const sqlite = Statement.makeCompilerSqlite()
    const fragment = Statement.fragment([
      Statement.identifier("value"),
      Statement.parameter(1)
    ])

    assert.deepStrictEqual(postgres.compile(fragment, false), ["\"value\"$1", [1]])
    assert.deepStrictEqual(sqlite.compile(fragment, false), ["\"value\"?", [1]])
  })

  it.effect("executes the connection under the sql.execute span", () =>
    Effect.gen(function*() {
      const seen: Array<string> = []
      const observe = Effect.map(
        Effect.option(Effect.currentSpan),
        (span) => {
          seen.push(Option.isSome(span) ? span.value.name : "none")
          return []
        }
      )
      const connection: Connection = {
        execute: () => observe,
        executeRaw: () => observe,
        executeStream: () => Stream.fromEffect(observe),
        executeValues: () => observe,
        executeUnprepared: () => observe,
        executeValuesUnprepared: () => observe
      }
      const sql = yield* SqlClient.make({
        acquirer: Effect.succeed(connection),
        compiler: Statement.makeCompilerSqlite(),
        spanAttributes: []
      })

      yield* sql`select 1`
      yield* sql`select 1`.values

      assert.deepStrictEqual(seen, ["sql.execute", "sql.execute"])
    }).pipe(Effect.provide(Reactivity.layer)))
})
