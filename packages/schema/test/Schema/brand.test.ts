import * as AST from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Brand from "effect/Brand"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import { assert, describe, expect, it } from "vitest"
import * as _schema from "../../src/internal/schema.js"

const isBrandConstructor = (u: unknown): u is Brand.Brand.Constructor<any> =>
  Predicate.hasProperty(u, Brand.RefinedConstructorsTypeId)

describe("Schema > brand", () => {
  describe("annotations", () => {
    it("using .annotations() on a BrandSchema should return a BrandSchema", () => {
      const schema = S.number.pipe(
        S.int(),
        S.brand("A")
      )
      const annotatedSchema = schema.annotations({
        [AST.DescriptionAnnotationId]: "an A brand"
      })
      expect(isBrandConstructor(annotatedSchema)).toBe(true)
    })

    it("brand as string (1 brand)", () => {
      // const Branded: S.BrandSchema<number & Brand<"A">, number, never>
      const schema = S.number.pipe(
        S.int(),
        S.brand("A", {
          description: "an A brand"
        })
      )

      expect(schema.ast.annotations).toEqual({
        [AST.TypeAnnotationId]: S.IntTypeId,
        [AST.BrandAnnotationId]: ["A"],
        [AST.TitleAnnotationId]: "integer",
        [AST.DescriptionAnnotationId]: "an A brand",
        [AST.JSONSchemaAnnotationId]: { type: "integer" }
      })
    })

    it("brand as string (2 brands)", () => {
      // const Branded: S.Schema<number, number & Brand<"A"> & Brand<"B">>
      const schema = S.number.pipe(
        S.int(),
        S.brand("A"),
        S.brand("B", {
          description: "a B brand"
        })
      )

      expect(schema.ast.annotations).toEqual({
        [AST.TypeAnnotationId]: S.IntTypeId,
        [AST.BrandAnnotationId]: ["A", "B"],
        [AST.TitleAnnotationId]: "integer",
        [AST.DescriptionAnnotationId]: "a B brand",
        [AST.JSONSchemaAnnotationId]: { type: "integer" }
      })
    })

    it("brand as symbol", () => {
      const A = Symbol.for("A")
      const B = Symbol.for("B")
      // const Branded: S.Schema<number, number & Brand<unique symbol> & Brand<unique symbol>>
      const schema = S.number.pipe(
        S.int(),
        S.brand(A),
        S.brand(B, {
          description: "a B brand"
        })
      )
      expect(schema.ast.annotations).toEqual({
        [AST.TypeAnnotationId]: S.IntTypeId,
        [AST.BrandAnnotationId]: [A, B],
        [AST.TitleAnnotationId]: "integer",
        [AST.DescriptionAnnotationId]: "a B brand",
        [AST.JSONSchemaAnnotationId]: { type: "integer" }
      })
    })
  })

  it("the constructor should throw on invalid values", () => {
    const IntegerFromString = S.NumberFromString.pipe(
      S.int({ identifier: "IntegerFromString" }),
      S.brand("Int")
    )
    expect(IntegerFromString(1)).toEqual(1)
    try {
      IntegerFromString(1.1)
      assert.fail("expected `IntegerFromString(1.1)` to throw an error")
    } catch (e) {
      expect(e).toStrictEqual(
        Brand.error(
          `IntegerFromString
└─ Predicate refinement failure
   └─ Expected IntegerFromString (an integer), actual 1.1`,
          ParseResult.parseError(
            new ParseResult.Refinement(
              IntegerFromString.ast as any,
              1.1,
              "Predicate",
              new ParseResult.Type(IntegerFromString.ast, 1.1)
            )
          )
        )
      )
    }
  })

  it("option", () => {
    const Int = S.NumberFromString.pipe(S.int(), S.brand("Int"))
    expect(Int.option(1)).toEqual(Option.some(1))
    expect(Int.option(1.2)).toEqual(Option.none())
  })

  it("either", () => {
    const Int = S.NumberFromString.pipe(S.int(), S.brand("Int"))
    expect(Int.either(1)).toEqual(Either.right(1))
    expect(Either.mapLeft(Int.either(1.2), (errors) => errors[0].message)).toEqual(Either.left(`integer
└─ Predicate refinement failure
   └─ Expected an integer, actual 1.2`))
  })

  it("is", () => {
    const Int = S.NumberFromString.pipe(S.int(), S.brand("Int"))
    expect(Int.is(1)).toEqual(true)
    expect(Int.is(1.2)).toEqual(false)
  })

  it("composition", () => {
    const int = <A extends number, I>(self: S.Schema<A, I>) => self.pipe(S.int(), S.brand("Int"))

    const positive = <A extends number, I>(self: S.Schema<A, I>) => self.pipe(S.positive(), S.brand("Positive"))

    const PositiveInt = S.NumberFromString.pipe(int, positive)

    expect(PositiveInt.is(1)).toEqual(true)
    expect(PositiveInt.is(-1)).toEqual(false)
    expect(PositiveInt.is(1.2)).toEqual(false)
  })

  describe("decoding", () => {
    it("string brand", async () => {
      const schema = S.NumberFromString.pipe(
        S.int(),
        S.brand("Int")
      ).annotations({ identifier: "IntegerFromString" })
      await Util.expectDecodeUnknownSuccess(schema, "1", 1 as any)
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `IntegerFromString
└─ From side refinement failure
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected a string, actual null`
      )
    })

    it("symbol brand", async () => {
      const Int = Symbol.for("Int")
      const schema = S.NumberFromString.pipe(
        S.int(),
        S.brand(Int)
      ).annotations({ identifier: "IntegerFromString" })
      await Util.expectDecodeUnknownSuccess(schema, "1", 1 as any)
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `IntegerFromString
└─ From side refinement failure
   └─ NumberFromString
      └─ Encoded side transformation failure
         └─ Expected a string, actual null`
      )
    })
  })
})
