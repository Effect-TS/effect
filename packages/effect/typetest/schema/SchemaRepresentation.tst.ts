import { type Schema, type SchemaAST, SchemaRepresentation } from "effect"
import { describe, expect, it } from "tstyche"

describe("SchemaRepresentation persisted wire", () => {
  it("exposes exact construction signatures", () => {
    expect(SchemaRepresentation.toRepresentation).type.toBe<
      (ast: SchemaAST.AST) => SchemaRepresentation.Document
    >()
    expect(SchemaRepresentation.toRepresentations).type.toBe<
      (
        asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>]
      ) => SchemaRepresentation.MultiDocument
    >()
    expect(SchemaRepresentation.fromSchemaMultiDocument).type.toBe<
      (document: SchemaRepresentation.SchemaMultiDocument) => SchemaRepresentation.MultiDocument
    >()
  })

  it("keeps projection explicit for single and multi documents", () => {
    expect(SchemaRepresentation.toJson).type.toBe<
      (document: SchemaRepresentation.Document) => Schema.Json
    >()
    expect(SchemaRepresentation.toJsonMultiDocument).type.toBe<
      (document: SchemaRepresentation.MultiDocument) => Schema.Json
    >()
  })

  it("wraps a document as a multi-document", () => {
    expect(SchemaRepresentation.toMultiDocument).type.toBe<
      (document: SchemaRepresentation.Document) => SchemaRepresentation.MultiDocument
    >()
  })

  it("constructs generated code", () => {
    expect(SchemaRepresentation.makeCode).type.toBe<
      (runtime: string, Type: string) => SchemaRepresentation.Code
    >()
  })

  it("keeps representation metadata separate from annotations", () => {
    const declaration = null as unknown as SchemaRepresentation.Declaration
    const filter = null as unknown as SchemaRepresentation.Filter
    const group = null as unknown as SchemaRepresentation.FilterGroup

    expect(declaration.representation).type.toBe<
      SchemaRepresentation.RepresentationAnnotation<SchemaRepresentation.Representation> | undefined
    >()
    expect(filter.representation).type.toBe<
      SchemaRepresentation.RepresentationAnnotation<SchemaRepresentation.Representation> | undefined
    >()
    expect(group.representation).type.toBe<
      SchemaRepresentation.RepresentationAnnotation<SchemaRepresentation.Representation> | undefined
    >()
  })
})
