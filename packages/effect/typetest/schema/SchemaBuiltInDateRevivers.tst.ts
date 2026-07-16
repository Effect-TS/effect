import { Schema, type SchemaRepresentation } from "effect"
import { describe, expect, it } from "tstyche"

describe("Schema built-in Date revivers", () => {
  it("composes every Date check reviver without casts", () => {
    const revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
      Schema.isDateValidReviver,
      Schema.isGreaterThanDateReviver,
      Schema.isGreaterThanOrEqualToDateReviver,
      Schema.isLessThanDateReviver,
      Schema.isLessThanOrEqualToDateReviver,
      Schema.isBetweenDateReviver
    ]

    expect(revivers).type.toBe<ReadonlyArray<SchemaRepresentation.AnyReviver>>()
    expect(Schema.isGreaterThanDateReviver).type.toBe<
      SchemaRepresentation.FilterReviver<{ readonly exclusiveMinimum: string }>
    >()
    expect(Schema.isBetweenDateReviver).type.toBe<
      SchemaRepresentation.FilterReviver<{
        readonly minimum: string
        readonly maximum: string
        readonly exclusiveMinimum?: true | undefined
        readonly exclusiveMaximum?: true | undefined
      }>
    >()
  })
})
