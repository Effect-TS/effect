import { Schema } from "effect"
import { describe, expect, it } from "tstyche"

describe("Schema Property Signature", () => {
  it("should have the correct field types", () => {
    const A = Schema.propertySignature(Schema.String)
    expect(A).type.toBe<Schema.propertySignature<typeof Schema.String>>()

    const AA = A.annotations({})
    expect(AA).type.toBe<Schema.propertySignature<typeof Schema.String>>()

    const B = Schema.optional(Schema.Number)
    expect(B).type.toBe<Schema.optional<typeof Schema.Number>>()

    const BB = B.annotations({})
    expect(BB).type.toBe<Schema.optional<typeof Schema.Number>>()

    const C = Schema.optionalWith(Schema.Boolean, { exact: true })
    expect(C).type.toBe<Schema.optionalWith<typeof Schema.Boolean, { exact: true }>>()

    const CC = C.annotations({})
    expect(CC).type.toBe<Schema.optionalWith<typeof Schema.Boolean, { exact: true }>>()

    const schema = Schema.Struct({
      a: AA,
      b: BB,
      c: CC
    })

    expect(schema.fields.a.from).type.toBe<typeof Schema.String>()
    expect(schema.fields.b.from).type.toBe<typeof Schema.Number>()
    expect(schema.fields.c.from).type.toBe<typeof Schema.Boolean>()
  })
})
