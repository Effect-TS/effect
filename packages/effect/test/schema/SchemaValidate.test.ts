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
  it("returns a boolean for every input", () => {
    const validate = Schema.validate(schema, { onExcessProperty: "error" })
    const accepted: boolean = validate({ a: "a" })
    const rejected: boolean = validate({ a: 1 })
    assert.strictEqual(accepted, true)
    assert.strictEqual(rejected, false)
  })

  it("honours onExcessProperty: error", () => {
    expectations(Schema.validate(schema, { onExcessProperty: "error" }))
  })

  it("uses the default strip behaviour when no options are supplied", () => {
    assertTrue(Schema.validate(schema)({ a: "a", b: "b" }))
    assertFalse(Schema.validate(schema)({}))
  })

  it("returns the same boolean for errors: first and errors: all", () => {
    const multi = Schema.Struct({
      a: Schema.String.check(Schema.isBetweenLength(2, 8)),
      b: Schema.String.check(Schema.isPattern(/^[0-9]+$/))
    })
    const input = { a: "", b: "x" }
    assert.strictEqual(
      Schema.validate(multi, { errors: "first", onExcessProperty: "error" })(input),
      Schema.validate(multi, { errors: "all", onExcessProperty: "error" })(input)
    )
    assertFalse(Schema.validate(multi, { errors: "all", onExcessProperty: "error" })(input))
    assertTrue(Schema.validate(multi, { errors: "all" })({ a: "ok", b: "123" }))
  })

  it("respects pattern checks of the imported schema", () => {
    const pattern = Schema.Struct({
      code: Schema.String.check(Schema.isPattern(/^[A-Z]{2}$/))
    })
    const validate = Schema.validate(pattern, { onExcessProperty: "error" })
    assertTrue(validate({ code: "AB" }))
    assertFalse(validate({ code: "ab" }))
    assertFalse(validate({ code: "ABC" }))
  })

  it("keeps Schema.is as a single-argument type guard", () => {
    // Backcompat: widening the guard returned by Schema.is with an optional
    // options parameter breaks its use as an Array.filter callback (the index
    // parameter conflicts) and removes type-predicate narrowing. Existing
    // Effect source uses `keys.filter(isPublicJwk)`, so Schema.is is unchanged.
    const is = Schema.is(schema)
    assertTrue(is({ a: "a" }))
    assert.strictEqual([{ a: "a" }, { a: "b" }].filter(is).length, 2)
  })
})
