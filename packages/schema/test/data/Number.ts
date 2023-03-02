import { pipe } from "@effect/data/Function"
import * as N from "@effect/schema/data/Number"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Number", () => {
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
})
