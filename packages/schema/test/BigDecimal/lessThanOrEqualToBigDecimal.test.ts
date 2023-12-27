import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("BigDecimal/lessThanOrEqualToBigDecimal", () => {
  const max = BigDecimal.fromNumber(5)
  const schema = S.BigDecimal.pipe(S.lessThanOrEqualToBigDecimal(max))

  it("decoding", async () => {
    await Util.expectParseSuccess(
      schema,
      "5",
      BigDecimal.normalize(BigDecimal.fromNumber(5))
    )
    await Util.expectParseFailure(
      schema,
      "6",
      "Expected a BigDecimal less than or equal to 5, actual BigDecimal(6)"
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.fromNumber(4.5), "4.5")
  })
})
