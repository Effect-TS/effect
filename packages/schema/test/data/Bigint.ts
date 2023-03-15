import { pipe } from "@effect/data/Function"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Bigint", () => {
  it("clampBigint", () => {
    const schema = pipe(S.bigint, S.clampBigint(-1n, 1n))

    Util.expectDecodingSuccess(schema, 3n, 1n)
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingSuccess(schema, -3n, -1n)
  })

  it("greaterThanBigint", () => {
    const schema = pipe(S.bigint, S.greaterThanBigint(0n))

    Util.expectDecodingFailure(schema, -1n, "Expected a bigint greater than 0n, actual -1n")
    Util.expectDecodingFailure(schema, 0n, "Expected a bigint greater than 0n, actual 0n")
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("greaterThanOrEqualToBigint", () => {
    const schema = pipe(S.bigint, S.greaterThanOrEqualToBigint(0n))

    Util.expectDecodingFailure(
      schema,
      -1n,
      "Expected a bigint greater than or equal to 0n, actual -1n"
    )
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("lessThanBigint", () => {
    const schema = pipe(S.bigint, S.lessThanBigint(0n))

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingFailure(schema, 0n, "Expected a bigint less than 0n, actual 0n")
    Util.expectDecodingFailure(schema, 1n, "Expected a bigint less than 0n, actual 1n")
  })

  it("lessThanOrEqualToBigint", () => {
    const schema = pipe(S.bigint, S.lessThanOrEqualToBigint(0n))

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingFailure(schema, 1n, "Expected a bigint less than or equal to 0n, actual 1n")
  })

  it("betweenBigint", () => {
    const schema = pipe(S.bigint, S.betweenBigint(-1n, 1n))

    Util.expectDecodingFailure(schema, -2n, "Expected a bigint between -1n and 1n, actual -2n")
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectEncodingSuccess(schema, 1n, 1n)
    Util.expectDecodingFailure(schema, 2n, "Expected a bigint between -1n and 1n, actual 2n")
  })

  it("positiveBigint", () => {
    const schema = pipe(S.bigint, S.positiveBigint())

    Util.expectDecodingFailure(schema, -1n, "Expected a positive bigint, actual -1n")
    Util.expectDecodingFailure(schema, 0n, "Expected a positive bigint, actual 0n")
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("negativeBigint", () => {
    const schema = pipe(S.bigint, S.negativeBigint())

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingFailure(schema, 0n, "Expected a negative bigint, actual 0n")
    Util.expectDecodingFailure(schema, 1n, "Expected a negative bigint, actual 1n")
  })

  it("nonNegativeBigint", () => {
    const schema = pipe(S.bigint, S.nonNegativeBigint())

    Util.expectEncodingFailure(schema, -1n, "Expected a non-negative bigint, actual -1n")
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingSuccess(schema, 1n, 1n)
  })

  it("nonPositiveBigint", () => {
    const schema = pipe(S.bigint, S.nonPositiveBigint())

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingFailure(schema, 1n, "Expected a non-positive bigint, actual 1n")
  })
})
