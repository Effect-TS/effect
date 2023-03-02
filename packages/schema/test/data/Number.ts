import { pipe } from "@effect/data/Function"
import * as N from "@effect/schema/data/Number"
import * as P from "@effect/schema/Parser"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Number", () => {
  it("exports", () => {
    expect(N.FiniteTypeId).exist
    expect(N.MultipleOfTypeId).exist
    expect(N.IntTypeId).exist
    expect(N.NonNaNTypeId).exist
    expect(N.GreaterThanTypeId).exist
    expect(N.GreaterThanOrEqualToTypeId).exist
    expect(N.LessThanTypeId).exist
    expect(N.LessThanOrEqualToTypeId).exist
    expect(N.BetweenTypeId).exist
    expect(N.PositiveTypeId).exist
    expect(N.NegativeTypeId).exist
    expect(N.NonNegativeTypeId).exist
    expect(N.NonPositiveTypeId).exist
  })

  it("clamp", () => {
    const schema = pipe(S.number, N.clamp(-1, 1))

    Util.expectDecodingSuccess(schema, 3, 1)
    Util.expectDecodingSuccess(schema, 0, 0)
    Util.expectDecodingSuccess(schema, -3, -1)
  })

  it("between", () => {
    const schema = pipe(S.number, N.between(-1, 1))

    Util.expectDecodingFailure(schema, -2, "Expected a number between -1 and 1, actual -2")
    Util.expectDecodingSuccess(schema, 0, 0)
    Util.expectEncodingSuccess(schema, 1, 1)
    Util.expectDecodingFailure(schema, 2, "Expected a number between -1 and 1, actual 2")
  })

  it("positive", () => {
    const schema = pipe(S.number, N.positive())

    Util.expectDecodingFailure(schema, -1, "Expected a positive number, actual -1")
    Util.expectDecodingFailure(schema, 0, "Expected a positive number, actual 0")
    Util.expectEncodingSuccess(schema, 1, 1)
  })

  it("negative", () => {
    const schema = pipe(S.number, N.negative())

    Util.expectEncodingSuccess(schema, -1, -1)
    Util.expectDecodingFailure(schema, 0, "Expected a negative number, actual 0")
    Util.expectDecodingFailure(schema, 1, "Expected a negative number, actual 1")
  })

  it("nonNegative", () => {
    const schema = pipe(S.number, N.nonNegative())

    Util.expectEncodingFailure(schema, -1, "Expected a non-negative number, actual -1")
    Util.expectDecodingSuccess(schema, 0, 0)
    Util.expectDecodingSuccess(schema, 1, 1)
  })

  it("nonPositive", () => {
    const schema = pipe(S.number, N.nonPositive())

    Util.expectEncodingSuccess(schema, -1, -1)
    Util.expectDecodingSuccess(schema, 0, 0)
    Util.expectDecodingFailure(schema, 1, "Expected a non-positive number, actual 1")
  })

  describe.concurrent("parseString", () => {
    const schema = N.parseString(S.string)

    it("property tests", () => {
      Util.property(schema)
    })

    it("Guard", () => {
      const is = P.is(schema)
      expect(is(1)).toEqual(true)
      expect(is("a")).toEqual(false)
    })

    it("Decoder", () => {
      Util.expectDecodingSuccess(schema, "1", 1)
      Util.expectDecodingSuccess(schema, "1a", 1)
      Util.expectDecodingFailure(
        schema,
        "a",
        `Expected a parsable value from string to number, actual "a"`
      )
      Util.expectDecodingFailure(
        schema,
        "a1",
        `Expected a parsable value from string to number, actual "a1"`
      )
    })

    it("Encoder", () => {
      Util.expectEncodingSuccess(schema, 1, "1")
    })

    it("example", () => {
      const schema = N.parseString(S.string) // converts string schema to number schema

      // success cases
      Util.expectDecodingSuccess(schema, "1", 1)
      Util.expectDecodingSuccess(schema, "-1", -1)
      Util.expectDecodingSuccess(schema, "1.5", 1.5)
      Util.expectDecodingSuccess(schema, "NaN", NaN)
      Util.expectDecodingSuccess(schema, "Infinity", Infinity)
      Util.expectDecodingSuccess(schema, "-Infinity", -Infinity)

      // failure cases
      Util.expectDecodingFailure(
        schema,
        "a",
        `Expected a parsable value from string to number, actual "a"`
      )
    })
  })
})
