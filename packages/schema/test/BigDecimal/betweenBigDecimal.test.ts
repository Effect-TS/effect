import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

const max = BigDecimal.make(1n, 0)
const min = BigDecimal.make(-1n, 0)

describe("BigDecimal/between", () => {
  const schema = S.BigDecimal.pipe(S.betweenBigDecimal(min, max))
  it("decoding", async () => {
    await Util.expectParseFailure(
      schema,
      "2",
      `Expected a BigDecimal between -1 and 1, actual {"_id":"BigDecimal","value":"2","scale":0}`
    )
    await Util.expectParseSuccess(schema, "0", BigDecimal.make(0n, 0))
    await Util.expectParseSuccess(
      schema,
      "0.2",
      BigDecimal.make(2n, 1)
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.make(0n, 0), "0")
  })
})
