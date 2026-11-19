// The compiled adapters must honour the same options as the interpreter.
// oxlint-disable-next-line no-unassigned-import
import "effect/schema/SchemaJITCompiler/enable"
import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { assertFalse, assertTrue } from "../utils/assert.ts"

const schema = Schema.Struct({ a: Schema.String })

describe("Schema.validate with the JIT compiler", () => {
  it("honours onExcessProperty: error", () => {
    const validate = Schema.validate(schema, { onExcessProperty: "error" })
    assertTrue(validate({ a: "a" }))
    assertFalse(validate({ a: "a", b: "b" }))
    assertFalse(validate({}))
  })

  it("uses the default strip behaviour when no options are supplied", () => {
    assertTrue(Schema.validate(schema)({ a: "a", b: "b" }))
  })

  it("matches the interpreter for errors and pattern options", () => {
    const pattern = Schema.Struct({
      code: Schema.String.check(Schema.isPattern(/^[A-Z]{2}$/))
    })
    for (const errors of ["first", "all"] as const) {
      const validate = Schema.validate(pattern, { errors, onExcessProperty: "error" })
      assertTrue(validate({ code: "AB" }))
      assertFalse(validate({ code: "ab" }))
    }
    assert.strictEqual(
      Schema.is(schema)({ a: "a" }),
      Schema.validate(schema)({ a: "a" })
    )
  })
})
