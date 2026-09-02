import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
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

  describe("returning fragment placeholders", () => {
    const makeSql = () =>
      Statement.make(
        Effect.die("Compilation must not acquire a connection"),
        Statement.makeCompiler({
          dialect: "pg",
          placeholder: (index) => `$${index}`,
          onIdentifier: Statement.defaultEscape("\""),
          onRecordUpdate: () => ["", []],
          onCustom: () => ["", []]
        }),
        [],
        undefined
      )

    for (const withoutTransform of [false, true]) {
      it(`renumbers a previously compiled returning fragment (withoutTransform=${withoutTransform})`, () => {
        const sql = makeSql()
        const returning = sql`${"label"} AS label`

        assert.deepStrictEqual(returning.compile(withoutTransform), ["$1 AS label", ["label"]])
        assert.deepStrictEqual(
          sql`INSERT INTO people ${sql.insert({ name: "Ada" }).returning(returning)}, ${"extra"} AS extra`.compile(
            withoutTransform
          ),
          ["INSERT INTO people (\"name\") VALUES ($1) RETURNING $2 AS label, $3 AS extra", ["Ada", "label", "extra"]]
        )
      })

      it(`numbers a fresh returning fragment without polluting its standalone cache (withoutTransform=${withoutTransform})`, () => {
        const sql = makeSql()
        const returning = sql`${"label"} AS label`

        assert.deepStrictEqual(
          sql`INSERT INTO people ${sql.insert({ name: "Ada" }).returning(returning)}, ${"extra"} AS extra`.compile(
            withoutTransform
          ),
          ["INSERT INTO people (\"name\") VALUES ($1) RETURNING $2 AS label, $3 AS extra", ["Ada", "label", "extra"]]
        )
        assert.deepStrictEqual(returning.compile(withoutTransform), ["$1 AS label", ["label"]])
      })

      it(`renumbers a previously compiled directly interpolated fragment (withoutTransform=${withoutTransform})`, () => {
        const sql = makeSql()
        const returning = sql`${"label"} AS label`

        assert.deepStrictEqual(returning.compile(withoutTransform), ["$1 AS label", ["label"]])
        assert.deepStrictEqual(
          sql`SELECT ${"Ada"} AS name, ${returning}, ${"extra"} AS extra`.compile(withoutTransform),
          ["SELECT $1 AS name, $2 AS label, $3 AS extra", ["Ada", "label", "extra"]]
        )
      })
    }
  })
})
