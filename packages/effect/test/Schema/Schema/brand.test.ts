import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Util from "../TestUtils.js"

describe("brand", () => {
  it("toString", () => {
    strictEqual(String(S.String.pipe(S.brand("my-brand"))), `string & Brand<"my-brand">`)
  })

  it("should expose the original schema as `from`", () => {
    const schema = S.String.pipe(S.brand("my-brand"))
    strictEqual(schema.from, S.String)
  })

  it("the constructor should validate the input by default", () => {
    const schema = S.NonEmptyString.pipe(S.brand("A"))
    Util.assertions.make.succeed(schema, "a")
    Util.assertions.make.fail(
      schema,
      "",
      `nonEmptyString & Brand<"A">
└─ Predicate refinement failure
   └─ Expected a non empty string, actual ""`
    )
  })

  it("the constructor validation can be disabled", () => {
    const schema = S.NonEmptyString.pipe(S.brand("A"))
    strictEqual(schema.make("", true), "")
    strictEqual(schema.make("", { disableValidation: true }), "")
  })

  describe("annotations", () => {
    it("using .annotations() twice", () => {
      const schema = S.Number.pipe(S.brand("A"))
      const annotatedSchema = schema.annotations({
        description: "description"
      }).annotations({ title: "title" })
      deepStrictEqual(annotatedSchema.ast.annotations, {
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
      strictEqual(typeof annotatedSchema.make, "function")
    })

    it("brand as string (1 brand)", () => {
      const schema = S.Number.pipe(
        S.int(),
        S.brand("A", {
          description: "description"
        })
      )
      strictEqual(String(schema), `int & Brand<"A">`)

      deepStrictEqual(schema.ast.annotations, {
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

      strictEqual(String(schema), `int & Brand<"A"> & Brand<"B">`)

      deepStrictEqual(schema.ast.annotations, {
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

      strictEqual(String(schema), "int & Brand<Symbol(A)> & Brand<Symbol(B)>")

      deepStrictEqual(schema.ast.annotations, {
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
    assertTrue(is(1))
    assertFalse(is(-1))
    assertFalse(is(1.2))
  })

  describe("decoding", () => {
    it("string brand", async () => {
      const schema = S.NumberFromString.pipe(
        S.int(),
        S.brand("Int")
      ).annotations({ identifier: "IntegerFromString" })
      await Util.assertions.decoding.succeed(schema, "1", 1 as any)
      await Util.assertions.decoding.fail(
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
      await Util.assertions.decoding.fail(
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
