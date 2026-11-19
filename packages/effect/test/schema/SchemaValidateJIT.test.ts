// The compiled adapters must honour the same options as the interpreter.
// oxlint-disable-next-line no-unassigned-import
import "effect/schema/SchemaJITCompiler/enable"
import { describe, it } from "@effect/vitest"
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
})
