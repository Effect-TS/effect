import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual } from "@effect/vitest/utils"
import { Effect, Schema as S, SchemaAST as AST } from "effect"

describe("typeAST", () => {
  describe(`should return the same reference if the AST doesn't represent a transformation`, () => {
    it("declaration (true)", () => {
      const schema = S.OptionFromSelf(S.String)
      assertTrue(AST.typeAST(schema.ast) === schema.ast)
    })

    it("declaration (false)", () => {
      const schema = S.OptionFromSelf(S.NumberFromString)
      assertFalse(AST.typeAST(schema.ast) === schema.ast)
    })

    it("tuple (true)", () => {
      const schema = S.Tuple(S.String, S.Number)
      assertTrue(AST.typeAST(schema.ast) === schema.ast)
    })

    it("tuple (false)", () => {
      const schema = S.Tuple(S.String, S.NumberFromString)
      assertFalse(AST.typeAST(schema.ast) === schema.ast)
    })

    it("array (true)", () => {
      const schema = S.Array(S.Number)
      assertTrue(AST.typeAST(schema.ast) === schema.ast)
    })

    it("array (false)", () => {
      const schema = S.Array(S.NumberFromString)
      assertFalse(AST.typeAST(schema.ast) === schema.ast)
    })

    it("union (true)", () => {
      const schema = S.Union(S.String, S.Number)
      assertTrue(AST.typeAST(schema.ast) === schema.ast)
    })

    it("union (false)", () => {
      const schema = S.Union(S.String, S.NumberFromString)
      assertFalse(AST.typeAST(schema.ast) === schema.ast)
    })

    it("struct (true)", () => {
      const schema = S.Struct({ a: S.String, b: S.Number })
      assertTrue(AST.typeAST(schema.ast) === schema.ast)
    })

    it("struct (false)", () => {
      const schema = S.Struct({ a: S.String, b: S.NumberFromString })
      assertFalse(AST.typeAST(schema.ast) === schema.ast)
    })

    it("record (true)", () => {
      const schema = S.Record({ key: S.String, value: S.Number })
      assertTrue(AST.typeAST(schema.ast) === schema.ast)
    })

    it("record (false)", () => {
      const schema = S.Record({ key: S.String, value: S.NumberFromString })
      assertFalse(AST.typeAST(schema.ast) === schema.ast)
    })

    it("refinement (true)", () => {
      const schema = S.Number.pipe(S.filter((n) => n > 0))
      assertTrue(AST.typeAST(schema.ast) === schema.ast)
    })

    it("refinement (false)", () => {
      const schema = S.NumberFromString.pipe(S.filter((n) => n > 0))
      assertFalse(AST.typeAST(schema.ast) === schema.ast)
    })
  })

  describe("Transformation", () => {
    it("should preserve whitelisted annotations", () => {
      const annotations: S.Annotations.GenericSchema<number> = {
        title: "title",
        description: "description",
        documentation: "documentation",
        identifier: "id",
        message: () => "message",
        schemaId: "schemaId",
        concurrency: 6,
        batching: true,
        parseIssueTitle: () => "parseIssueTitle",
        parseOptions: { onExcessProperty: "error" },
        decodingFallback: () => Effect.succeed(7),
        // whitelisted annotations
        examples: [1, 2, 3],
        default: 4,
        jsonSchema: { type: "object" },
        arbitrary: () => (fc) => fc.constant(5),
        pretty: () => () => "pretty",
        equivalence: () => () => true
      }
      const schema = S.transform(
        S.Number,
        S.Number.annotations({
          title: "original-title",
          description: "original-description"
        }),
        { decode: (n) => n, encode: (n) => n }
      ).annotations(annotations)
      deepStrictEqual(AST.typeAST(schema.ast).annotations, {
        [AST.TitleAnnotationId]: "original-title",
        [AST.DescriptionAnnotationId]: "original-description",
        // whitelisted annotations
        [AST.ExamplesAnnotationId]: annotations.examples,
        [AST.DefaultAnnotationId]: annotations.default,
        [AST.JSONSchemaAnnotationId]: annotations.jsonSchema,
        [AST.ArbitraryAnnotationId]: annotations.arbitrary,
        [AST.PrettyAnnotationId]: annotations.pretty,
        [AST.EquivalenceAnnotationId]: annotations.equivalence
      })
    })
  })
})
