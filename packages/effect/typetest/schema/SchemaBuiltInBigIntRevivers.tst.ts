import { Schema, type SchemaRepresentation } from "effect"
import { describe, expect, it } from "tstyche"

describe("Schema built-in BigInt revivers", () => {
  it("composes every BigInt check reviver without casts", () => {
    const revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
      Schema.isGreaterThanBigIntReviver,
      Schema.isGreaterThanOrEqualToBigIntReviver,
      Schema.isLessThanBigIntReviver,
      Schema.isLessThanOrEqualToBigIntReviver,
      Schema.isBetweenBigIntReviver
    ]

    expect(revivers).type.toBe<ReadonlyArray<SchemaRepresentation.AnyReviver>>()
    expect(Schema.isGreaterThanBigIntReviver).type.toBe<
      SchemaRepresentation.FilterReviver<{ readonly exclusiveMinimum: string }>
    >()
    expect(Schema.isBetweenBigIntReviver).type.toBe<
      SchemaRepresentation.FilterReviver<{
        readonly minimum: string
        readonly maximum: string
        readonly exclusiveMinimum?: true | undefined
        readonly exclusiveMaximum?: true | undefined
      }>
    >()
  })
})
