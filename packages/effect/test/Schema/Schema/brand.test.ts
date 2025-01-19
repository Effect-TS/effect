import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("brand", () => {
  it("toString", () => {
    expect(String(S.String.pipe(S.brand("my-brand")))).toStrictEqual(`string & Brand<"my-brand">`)
  })

  it("the constructor should validate the input by default", () => {
    const schema = S.NonEmptyString.pipe(S.brand("A"))
    Util.assertions.make.succeed(schema, "a")
    Util.assertions.make.fail(
      schema,
      "",
      `NonEmptyString
└─ Predicate refinement failure
   └─ Expected a non empty string, actual ""`
    )
  })

  it("the constructor validation can be disabled", () => {
    const schema = S.NonEmptyString.pipe(S.brand("A"))
    expect(schema.make("", true)).toStrictEqual("")
    expect(schema.make("", { disableValidation: true })).toStrictEqual("")
  })

  describe("annotations", () => {
    it("using .annotations() twice", () => {
      const schema = S.Number.pipe(S.brand("A"))
      const annotatedSchema = schema.annotations({
        description: "description"
      }).annotations({ title: "title" })
      expect(annotatedSchema.ast.annotations).toEqual({
        [AST.BrandAnnotationId]: ["A"],
        [AST.TitleAnnotationId]: "title",
        [AST.DescriptionAnnotationId]: "description"
      })
    })

    it("using .annotations() on a BrandSchema should return a BrandSchema", () => {
      const schema = S.Number.pipe(
        S.int(),
        S.brand("A")
      )
      const annotatedSchema = schema.annotations({
        description: "description"
      }).annotations({ title: "title" })
      expect(typeof annotatedSchema.make).toBe("function")
    })

    it("brand as string (1 brand)", () => {
      const schema = S.Number.pipe(
        S.int(),
        S.brand("A", {
          description: "description"
        })
      )
      expect(String(schema)).toBe(`int & Brand<"A">`)

      expect(schema.ast.annotations).toEqual({
        [AST.SchemaIdAnnotationId]: S.IntSchemaId,
        [AST.BrandAnnotationId]: ["A"],
        [AST.TitleAnnotationId]: "int",
        [AST.DescriptionAnnotationId]: "description",
        [AST.JSONSchemaAnnotationId]: { type: "integer" }
      })
    })

    it("brand as string (2 brands)", () => {
      const schema = S.Number.pipe(
        S.int(),
        S.brand("A"),
        S.brand("B", {
          description: "description"
        })
      )

      expect(String(schema)).toBe(`int & Brand<"A"> & Brand<"B">`)

      expect(schema.ast.annotations).toEqual({
        [AST.SchemaIdAnnotationId]: S.IntSchemaId,
        [AST.BrandAnnotationId]: ["A", "B"],
        [AST.TitleAnnotationId]: "int",
        [AST.DescriptionAnnotationId]: "description",
        [AST.JSONSchemaAnnotationId]: { type: "integer" }
      })
    })

    it("brand as symbol", () => {
      const A = Symbol.for("A")
      const B = Symbol.for("B")
      const schema = S.Number.pipe(
        S.int(),
        S.brand(A),
        S.brand(B, {
          description: "description"
        })
      )

      expect(String(schema)).toBe("int & Brand<Symbol(A)> & Brand<Symbol(B)>")

      expect(schema.ast.annotations).toEqual({
        [AST.SchemaIdAnnotationId]: S.IntSchemaId,
        [AST.BrandAnnotationId]: [A, B],
        [AST.TitleAnnotationId]: "int",
        [AST.DescriptionAnnotationId]: "description",
        [AST.JSONSchemaAnnotationId]: { type: "integer" }
      })
    })
  })

  it("composition", () => {
    const int = <A extends number, I>(self: S.Schema<A, I>) => self.pipe(S.int(), S.brand("Int"))

    const positive = <A extends number, I>(self: S.Schema<A, I>) => self.pipe(S.positive(), S.brand("Positive"))

    const PositiveInt = S.NumberFromString.pipe(int, positive)

    const is = S.is(PositiveInt)
    expect(is(1)).toEqual(true)
    expect(is(-1)).toEqual(false)
    expect(is(1.2)).toEqual(false)
  })

  describe("decoding", () => {
    it("string brand", async () => {
      const schema = S.NumberFromString.pipe(
        S.int(),
        S.brand("Int")
      ).annotations({ identifier: "IntegerFromString" })
      await Util.assertions.decoding.succeed(schema, "1", 1 as any)
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `IntegerFromString
└─ From side refinement failure
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected string, actual null`
      )
    })

    it("symbol brand", async () => {
      const Int = Symbol.for("Int")
      const schema = S.NumberFromString.pipe(
        S.int(),
        S.brand(Int)
      ).annotations({ identifier: "IntegerFromString" })
      await Util.assertions.decoding.succeed(schema, "1", 1 as any)
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `IntegerFromString
└─ From side refinement failure
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected string, actual null`
      )
    })
  })
})
