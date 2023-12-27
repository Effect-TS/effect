import * as AST from "@effect/schema/AST"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as Either from "effect/Either"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

describe("Schema/brand", () => {
  describe("annotations", () => {
    it("should move the brand annotations to the right end", async () => {
      const schema = Util.X2.pipe(S.brand("X2"))
      const to = S.to(schema)
      expect(to.ast).toEqual(S.string.pipe(S.brand("X2")).ast)
    })

    it("brand as string", () => {
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
    const Int = S.NumberFromString.pipe(S.int(), S.brand("Int"))
    expect(Int(1)).toEqual(1)
    expect(() => Int(1.2)).toThrow(
      new Error(`error(s) found
└─ Expected integer, actual 1.2`)
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
      message: "Expected integer, actual 1.2"
    }]))
  })

  it("is", () => {
    const Int = S.NumberFromString.pipe(S.int(), S.brand("Int"))
    expect(Int.is(1)).toEqual(true)
    expect(Int.is(1.2)).toEqual(false)
  })

  it("composition", () => {
    const int = <I, A extends number>(self: S.Schema<I, A>) => self.pipe(S.int(), S.brand("Int"))

    const positive = <I, A extends number>(self: S.Schema<I, A>) =>
      self.pipe(S.positive(), S.brand("Positive"))

    const PositiveInt = S.NumberFromString.pipe(int, positive)

    expect(PositiveInt.is(1)).toEqual(true)
    expect(PositiveInt.is(-1)).toEqual(false)
    expect(PositiveInt.is(1.2)).toEqual(false)
  })

  describe("decoding", () => {
    it("string brand", async () => {
      const schema = S.NumberFromString.pipe(S.int(), S.brand("Int"))
      await Util.expectParseSuccess(schema, "1", 1 as any)
      await Util.expectParseFailure(
        schema,
        null,
        `Expected string, actual null`
      )
    })

    it("symbol brand", async () => {
      const Int = Symbol.for("Int")
      const schema = S.NumberFromString.pipe(S.int(), S.brand(Int))
      await Util.expectParseSuccess(schema, "1", 1 as any)
      await Util.expectParseFailure(
        schema,
        null,
        `Expected string, actual null`
      )
    })
  })
})
