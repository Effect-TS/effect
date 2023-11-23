import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("BigDecimal/lessThanBigDecimal", () => {
  const max = BigDecimal.fromNumber(5)
  const schema = S.BigDecimal.pipe(S.lessThanBigDecimal(max))

  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      "5",
      "Expected a BigDecimal less than 5, actual {\"_id\":\"BigDecimal\",\"value\":\"5\",\"scale\":0}"
    )
    await Util.expectParseFailure(
      schema,
      "6",
      "Expected a BigDecimal less than 5, actual {\"_id\":\"BigDecimal\",\"value\":\"6\",\"scale\":0}"
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.fromNumber(4.5), "4.5")
  })
})
