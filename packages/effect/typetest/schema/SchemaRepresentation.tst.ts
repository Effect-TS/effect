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
      SchemaRepresentation.RepresentationAnnotation | undefined
    >()
    expect(filter.representation).type.toBe<
      SchemaRepresentation.CheckRepresentationAnnotation<SchemaRepresentation.Representation> | undefined
    >()
    expect(group.representation).type.toBe<
      SchemaRepresentation.CheckRepresentationAnnotation<SchemaRepresentation.Representation> | undefined
    >()
  })

  it("correlates literal types and values", () => {
    const literal = null as unknown as SchemaRepresentation.Literal
    if (literal.literal.type === "string") {
      expect(literal.literal.value).type.toBe<string>()
    } else if (literal.literal.type === "number") {
      expect(literal.literal.value).type.toBe<number>()
    } else if (literal.literal.type === "bigint") {
      expect(literal.literal.value).type.toBe<bigint>()
    } else {
      expect(literal.literal.value).type.toBe<boolean>()
    }

    expect(
      {
        _tag: "Literal",
        literal: { type: "string", value: "value" },
        checks: []
      } as const
    ).type.toBeAssignableTo<SchemaRepresentation.Literal>()

    expect(
      {
        _tag: "Literal",
        literal: { type: "boolean", value: "true" },
        checks: []
      } as const
    ).type.not.toBeAssignableTo<SchemaRepresentation.Literal>()
  })

  it("correlates Enum types and values", () => {
    const value = null as unknown as SchemaRepresentation.EnumValue
    if (value.type === "string") {
      expect(value.value).type.toBe<string>()
    } else {
      expect(value.value).type.toBe<number>()
    }

    expect({ type: "number", value: 1 } as const).type.toBeAssignableTo<SchemaRepresentation.EnumValue>()
    expect({ type: "number", value: "1" } as const).type.not.toBeAssignableTo<SchemaRepresentation.EnumValue>()
  })

  it("correlates property name types and values", () => {
    const name = null as unknown as SchemaRepresentation.PropertyName
    if (name.type === "string") {
      expect(name.value).type.toBe<string>()
    } else if (name.type === "number") {
      expect(name.value).type.toBe<number>()
    } else {
      expect(name.value).type.toBe<symbol>()
    }

    expect({ type: "symbol", value: Symbol.for("key") } as const).type.toBeAssignableTo<
      SchemaRepresentation.PropertyName
    >()
    expect({ type: "symbol", value: "Symbol(key)" } as const).type.not.toBeAssignableTo<
      SchemaRepresentation.PropertyName
    >()
  })
})
