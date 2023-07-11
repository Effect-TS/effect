import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"

describe.concurrent("Refinement", () => {
  it("refinement", async () => {
    const schema = S.NumberFromString.pipe(
      S.greaterThanOrEqualTo(1),
      S.lessThanOrEqualTo(2)
    )
    await Util.expectParseSuccess(schema, "1", 1)
    await Util.expectParseFailure(
      schema,
      "0",
      `Expected a number greater than or equal to 1, actual 0`
    )
    await Util.expectParseFailure(
      schema,
      "3",
      `Expected a number less than or equal to 2, actual 3`
    )

    await Util.expectEncodeSuccess(schema, 1, "1")
    await Util.expectEncodeFailure(
      schema,
      0,
      `Expected a number greater than or equal to 1, actual 0`
    )
    await Util.expectEncodeFailure(
      schema,
      3,
      `Expected a number less than or equal to 2, actual 3`
    )
  })
})
