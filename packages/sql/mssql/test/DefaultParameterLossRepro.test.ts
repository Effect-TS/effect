import { MssqlClient } from "@effect/sql-mssql"
import { assert, it } from "@effect/vitest"

it("preserves fractional JavaScript numbers with the default parameter mapping", () => {
  const value = MssqlClient.defaultParameterTypes.number.validate(1.5)

  assert.strictEqual(value, 1.5)
})

it("preserves Unicode JavaScript strings with the default parameter mapping", () => {
  const value = MssqlClient.defaultParameterTypes.string.validate("lambda: \u03bb", {
    codepage: "CP1252"
  } as any) as Buffer

  assert.strictEqual(value.toString("latin1"), "lambda: \u03bb")
})
