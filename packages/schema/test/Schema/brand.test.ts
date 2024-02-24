import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Schema > brand", () => {
  describe("annotations", () => {
    it("brand as string (1 brand)", () => {
      // const Branded: S.BrandSchema<number & Brand<"A">, number, never>
      const Branded = S.number.pipe(
        S.int(),
        S.brand("A", {
          description: "an A brand"
        })
      )

      expect(Branded.ast.annotations).toEqual({
        [AST.TypeAnnotationId]: S.IntTypeId,
        [AST.BrandAnnotationId]: ["A"],
        [AST.TitleAnnotationId]: "integer",
        [AST.DescriptionAnnotationId]: "an A brand",
        [AST.JSONSchemaAnnotationId]: { type: "integer" }
      })
    })

    it("brand as string (2 brands)", () => {
      // const Branded: S.Schema<number, number & Brand<"A"> & Brand<"B">>
      const Branded = S.number.pipe(
        S.int(),
        S.brand("A"),
        S.brand("B", {
          description: "a B brand"
        })
      )

      expect(Branded.ast.annotations).toEqual({
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
      const Branded = S.number.pipe(
        S.int(),
        S.brand(A),
        S.brand(B, {
          description: "a B brand"
        })
      )
      expect(Branded.ast.annotations).toEqual({
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
      S.int(),
      S.identifier("IntegerFromString"),
      S.brand("Int")
    )
    expect(IntegerFromString(1)).toEqual(1)
    expect(() => IntegerFromString(1.2)).toThrow(
      new Error(`IntegerFromString
└─ Predicate refinement failure
   └─ Expected IntegerFromString (an integer), actual 1.2`)
    )
  })

  it("option", () => {
    const Int = S.NumberFromString.pipe(S.int(), S.brand("Int"))
    expect(Int.option(1)).toEqual(Option.some(1))
    expect(Int.option(1.2)).toEqual(Option.none())
  })

  it("either", () => {
    const Int = S.NumberFromString.pipe(S.int(), S.brand("Int"))
    expect(Int.either(1)).toEqual(Either.right(1))
    expect(Int.either(1.2)).toEqual(Either.left([{
      meta: [],
      message: "Expected an integer, actual 1.2"
    }]))
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
        S.brand("Int"),
        S.identifier("IntegerFromString")
      )
      await Util.expectDecodeUnknownSuccess(schema, "1", 1 as any)
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `IntegerFromString
└─ From side refinement failure
   └─ NumberFromString
      └─ From side transformation failure
         └─ Expected a string, actual null`
      )
    })

    it("symbol brand", async () => {
      const Int = Symbol.for("Int")
      const schema = S.NumberFromString.pipe(
        S.int(),
        S.brand(Int),
        S.identifier("IntegerFromString")
      )
      await Util.expectDecodeUnknownSuccess(schema, "1", 1 as any)
      await Util.expectDecodeUnknownFailure(
        schema,
        null,
        `IntegerFromString
└─ From side refinement failure
   └─ NumberFromString
      └─ From side transformation failure
         └─ Expected a string, actual null`
      )
    })
  })
})
