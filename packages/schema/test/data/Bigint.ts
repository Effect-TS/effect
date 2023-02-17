import { pipe } from "@fp-ts/core/Function"
import * as B from "@fp-ts/schema/data/Bigint"
import * as S from "@fp-ts/schema/Schema"
import * as Util from "@fp-ts/schema/test/util"

describe.concurrent("Bigint", () => {
  it("greaterThan", () => {
    const schema = pipe(S.bigint, B.greaterThan(0n))

    Util.expectDecodingFailure(schema, -1n, "Expected a bigint greater than 0, actual -1")
    Util.expectDecodingFailure(schema, 0n, "Expected a bigint greater than 0, actual 0")
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("greaterThanOrEqualTo", () => {
    const schema = pipe(S.bigint, B.greaterThanOrEqualTo(0n))

    Util.expectDecodingFailure(
      schema,
      -1n,
      "Expected a bigint greater than or equal to 0, actual -1"
    )
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("lessThan", () => {
    const schema = pipe(S.bigint, B.lessThan(0n))

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingFailure(schema, 0n, "Expected a bigint less than 0, actual 0")
    Util.expectDecodingFailure(schema, 1n, "Expected a bigint less than 0, actual 1")
  })

  it("lessThanOrEqualTo", () => {
    const schema = pipe(S.bigint, B.lessThanOrEqualTo(0n))

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingFailure(schema, 1n, "Expected a bigint less than or equal to 0, actual 1")
  })

  it("between", () => {
    const schema = pipe(S.bigint, B.between(-1n, 1n))

    Util.expectDecodingFailure(schema, -2n, "Expected a bigint between -1 and 1, actual -2")
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectEncodingSuccess(schema, 1n, 1n)
    Util.expectDecodingFailure(schema, 2n, "Expected a bigint between -1 and 1, actual 2")
  })

  it("positive", () => {
    const schema = pipe(S.bigint, B.positive())

    Util.expectDecodingFailure(schema, -1n, "Expected a positive bigint, actual -1")
    Util.expectDecodingFailure(schema, 0n, "Expected a positive bigint, actual 0")
    Util.expectEncodingSuccess(schema, 1n, 1n)
  })

  it("negative", () => {
    const schema = pipe(S.bigint, B.negative())

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingFailure(schema, 0n, "Expected a negative bigint, actual 0")
    Util.expectDecodingFailure(schema, 1n, "Expected a negative bigint, actual 1")
  })

  it("nonNegative", () => {
    const schema = pipe(S.bigint, B.nonNegative())

    Util.expectEncodingFailure(schema, -1n, "Expected a non-negative bigint, actual -1")
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingSuccess(schema, 1n, 1n)
  })

  it("nonPositive", () => {
    const schema = pipe(S.bigint, B.nonPositive())

    Util.expectEncodingSuccess(schema, -1n, -1n)
    Util.expectDecodingSuccess(schema, 0n, 0n)
    Util.expectDecodingFailure(schema, 1n, "Expected a non-positive bigint, actual 1")
  })
})
