import { Schema, SchemaRepresentation } from "effect"
import { describe, expect, it } from "tstyche"

describe("SchemaRepresentation revivers", () => {
  it("accepts concrete payload revivers at the erased collection boundary", () => {
    const reviver: SchemaRepresentation.FilterReviver<{ readonly source: string }> = {
      _tag: "Filter",
      id: "acme/schema/isPattern",
      payloadSchema: Schema.Struct({ source: Schema.String }),
      schemasArity: 0,
      revive: ({ payload, annotations }) => Schema.isPattern(new RegExp(payload.source), annotations)
    }
    const revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [reviver]

    expect(revivers).type.toBe<ReadonlyArray<SchemaRepresentation.AnyReviver>>()
  })

  it("separates JSON decoding from schema revival", () => {
    expect(SchemaRepresentation.fromJson).type.toBe<
      (input: Schema.Json) => SchemaRepresentation.Document
    >()
    expect(SchemaRepresentation.fromJsonMultiDocument).type.toBe<
      (input: Schema.Json) => SchemaRepresentation.MultiDocument
    >()
    expect(SchemaRepresentation.toSchema).type.toBe<
      (
        document: SchemaRepresentation.Document,
        options: { readonly revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> }
      ) => Schema.Top
    >()
    expect(SchemaRepresentation.toSchemaMultiDocument).type.toBe<
      (
        document: SchemaRepresentation.MultiDocument,
        options: { readonly revivers: ReadonlyArray<SchemaRepresentation.AnyReviver> }
      ) => SchemaRepresentation.SchemaMultiDocument
    >()

    const document = SchemaRepresentation.fromJson({ representation: { _tag: "String", checks: [] }, references: {} })
    // @ts-expect-error Expected 2 arguments, but got 1.
    SchemaRepresentation.toSchema(document)
    // @ts-expect-error Expected 2 arguments, but got 1.
    SchemaRepresentation.toSchemaMultiDocument({ representations: [], references: {} })
  })
})
