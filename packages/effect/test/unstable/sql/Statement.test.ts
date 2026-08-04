import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
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

  it("keeps compiler configuration when an acquirer is reused", () => {
    const acquirer = Effect.die("not executed")
    const postgres = Statement.makeCompiler({
      dialect: "pg",
      placeholder: (index) => `$${index}`,
      onIdentifier: Statement.defaultEscape("\""),
      onRecordUpdate: () => ["", []],
      onCustom: () => ["", []]
    })
    const pg = Statement.make(acquirer, postgres, [], undefined)
    const sqlite = Statement.make(acquirer, Statement.makeCompilerSqlite(), [], undefined)

    assert.deepStrictEqual(pg`select ${1}`.compile(), ["select $1", [1]])
    assert.deepStrictEqual(sqlite`select ${1}`.compile(), ["select ?", [1]])
  })
})
