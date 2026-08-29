import { Schema, type SchemaRepresentation } from "effect"
import { describe, expect, it } from "tstyche"

describe("Schema built-in collection revivers", () => {
  it("restricts isUniqueKey to arrays of key-value tuples", () => {
    const check = Schema.isUniqueKey<string, number>()

    Schema.Array(Schema.Tuple([Schema.String, Schema.Number])).check(check)
    Schema.Array(Schema.String).check(
      // @ts-expect-error Argument of type
      check
    )
  })

  it("composes every collection check reviver without casts", () => {
    const revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
      Schema.isMinSizeReviver,
      Schema.isMaxSizeReviver,
      Schema.isSizeBetweenReviver,
      Schema.isUniqueReviver,
      Schema.isUniqueKeyReviver
    ]

    expect(revivers).type.toBe<ReadonlyArray<SchemaRepresentation.AnyReviver>>()
    expect(Schema.isMinSizeReviver).type.toBe<
      SchemaRepresentation.FilterReviver<{ readonly minSize: number }>
    >()
    expect(Schema.isSizeBetweenReviver).type.toBe<
      SchemaRepresentation.FilterReviver<{
        readonly minimum: number
        readonly maximum: number
      }>
    >()
    expect(Schema.isUniqueReviver).type.toBe<SchemaRepresentation.FilterReviver<null>>()
    expect(Schema.isUniqueKeyReviver).type.toBe<SchemaRepresentation.FilterReviver<null>>()
  })
})
