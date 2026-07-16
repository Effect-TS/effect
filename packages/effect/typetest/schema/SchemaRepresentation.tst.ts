import { type Schema, SchemaRepresentation } from "effect"
import { describe, expect, it } from "tstyche"

describe("SchemaRepresentation persisted wire", () => {
  it("exposes codecs for documents", () => {
    expect(SchemaRepresentation.DocumentFromJson).type.toBe<
      Schema.Codec<
        SchemaRepresentation.Document,
        Schema.Json
      >
    >()
    expect(SchemaRepresentation.MultiDocumentFromJson).type.toBe<
      Schema.Codec<
        SchemaRepresentation.MultiDocument,
        Schema.Json
      >
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
})
