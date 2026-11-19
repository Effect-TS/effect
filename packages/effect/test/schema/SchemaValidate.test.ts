import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { assertFalse, assertTrue } from "../utils/assert.ts"

const schema = Schema.Struct({ a: Schema.String })

const expectations = (validate: (input: unknown) => boolean) => {
  assertTrue(validate({ a: "a" }))
  assertFalse(validate({ a: "a", b: "b" }))
  assertFalse(validate({}))
  assertFalse(validate(null))
}

describe("Schema.validate", () => {
  it("honours onExcessProperty: error", () => {
    expectations(Schema.validate(schema, { onExcessProperty: "error" }))
  })

  it("uses the default strip behaviour when no options are supplied", () => {
    assertTrue(Schema.validate(schema)({ a: "a", b: "b" }))
    assertFalse(Schema.validate(schema)({}))
  })

  it("keeps Schema.is as a single-argument type guard", () => {
    const is = Schema.is(schema)
    assertTrue(is({ a: "a" }))
    assert.strictEqual([{ a: "a" }, { a: "b" }].filter(is).length, 2)
  })
})
