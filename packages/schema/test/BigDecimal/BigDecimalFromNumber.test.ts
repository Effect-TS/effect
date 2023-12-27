import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("BigDecimal/BigDecimalFromNumber", () => {
  const schema = S.BigDecimalFromNumber

  it("decoding", async () => {
    await Util.expectParseSuccess(
      schema,
      2,
      BigDecimal.make(2n, 0)
    )
    await Util.expectParseSuccess(
      schema,
      0.123,
      BigDecimal.make(123n, 3)
    )
    await Util.expectParseSuccess(
      schema,
      0,
      BigDecimal.make(0n, 0)
    )
    await Util.expectParseFailure(
      schema,
      "abc",
      `Expected number, actual "abc"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(2n, 0),
      2
    )
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(123n, 3),
      0.123
    )
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(0n, 0),
      0
    )
  })
})
