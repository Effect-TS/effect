import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("BigDecimal/greaterThanOrEqualToBigDecimal", () => {
  const min = BigDecimal.fromNumber(10)
  const schema = S.BigDecimal.pipe(S.greaterThanOrEqualToBigDecimal(min))

  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      "0",
      "Expected a BigDecimal greater than or equal to 10, actual BigDecimal(0)"
    )
    await Util.expectParseSuccess(
      schema,
      "10",
      BigDecimal.normalize(BigDecimal.fromNumber(10))
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.fromNumber(11), "11")
  })
})
