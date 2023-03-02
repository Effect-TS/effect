import { pipe } from "@effect/data/Function"
import * as B from "@effect/schema/data/Bigint"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Bigint", () => {
  it("exports", () => {
    expect(B.GreaterThanTypeId).exist
    expect(B.GreaterThanOrEqualToTypeId).exist
    expect(B.LessThanTypeId).exist
    expect(B.LessThanOrEqualToTypeId).exist
    expect(B.BetweenTypeId).exist
    expect(B.PositiveTypeId).exist
    expect(B.NegativeTypeId).exist
    expect(B.NonNegativeTypeId).exist
    expect(B.NonPositiveTypeId).exist
  })

  it("clamp", () => {
    const schema = pipe(S.bigint, B.clamp(-1n, 1n))

    Util.expectDecodingSuccess(schema, 3n, 1n)
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingSuccess(schema, -3n, -1n)
  })

  it("greaterThan", () => {
    const schema = pipe(S.bigint, B.greaterThan(0n))

    Util.expectDecodingFailure(schema, -1n, "Expected a bigint greater than 0n, actual -1n")
    Util.expectDecodingFailure(schema, 0n, "Expected a bigint greater than 0n, actual 0n")
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("greaterThanOrEqualTo", () => {
    const schema = pipe(S.bigint, B.greaterThanOrEqualTo(0n))

    Util.expectDecodingFailure(
      schema,
      -1n,
      "Expected a bigint greater than or equal to 0n, actual -1n"
    )
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("lessThan", () => {
    const schema = pipe(S.bigint, B.lessThan(0n))

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingFailure(schema, 0n, "Expected a bigint less than 0n, actual 0n")
    Util.expectDecodingFailure(schema, 1n, "Expected a bigint less than 0n, actual 1n")
  })

  it("lessThanOrEqualTo", () => {
    const schema = pipe(S.bigint, B.lessThanOrEqualTo(0n))

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingFailure(schema, 1n, "Expected a bigint less than or equal to 0n, actual 1n")
  })

  it("between", () => {
    const schema = pipe(S.bigint, B.between(-1n, 1n))

    Util.expectDecodingFailure(schema, -2n, "Expected a bigint between -1n and 1n, actual -2n")
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectEncodingSuccess(schema, 1n, 1n)
    Util.expectDecodingFailure(schema, 2n, "Expected a bigint between -1n and 1n, actual 2n")
  })

  it("positive", () => {
    const schema = pipe(S.bigint, B.positive())

    Util.expectDecodingFailure(schema, -1n, "Expected a positive bigint, actual -1n")
    Util.expectDecodingFailure(schema, 0n, "Expected a positive bigint, actual 0n")
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("negative", () => {
    const schema = pipe(S.bigint, B.negative())

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingFailure(schema, 0n, "Expected a negative bigint, actual 0n")
    Util.expectDecodingFailure(schema, 1n, "Expected a negative bigint, actual 1n")
  })

  it("nonNegative", () => {
    const schema = pipe(S.bigint, B.nonNegative())

    Util.expectEncodingFailure(schema, -1n, "Expected a non-negative bigint, actual -1n")
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingSuccess(schema, 1n, 1n)
  })

  it("nonPositive", () => {
    const schema = pipe(S.bigint, B.nonPositive())

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingFailure(schema, 1n, "Expected a non-positive bigint, actual 1n")
  })
})
