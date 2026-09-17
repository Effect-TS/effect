import { Snowflake } from "@effect/cluster"
import { assert, describe, it } from "@effect/vitest"

// mysql2 returns BIGINTs as numbers when their decimal digits round-trip through a double.
describe("Snowflake", () => {
  for (const id of [226271763047567360n, 226271763047587840n, 226271763047608320n]) {
    it(`normalizes driver number ${id} to an exact bigint`, () => {
      assert.strictEqual(BigInt(Number(id)), id)
      assert.strictEqual(Snowflake.Snowflake(Number(id) as any), id)
    })
  }

  for (const id of [226271763047567360n, 226271763047567361n]) {
    it(`normalizes driver string ${id} to an exact bigint`, () => {
      assert.strictEqual(Snowflake.Snowflake(String(id)), id)
    })
    it(`preserves bigint ${id}`, () => {
      assert.strictEqual(Snowflake.Snowflake(id), id)
    })
  }
})
