import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, it } from "vitest"

describe("BigDecimal/BigDecimal", () => {
  const schema = S.BigDecimal

  it("decoding", async () => {
    await Util.expectParseSuccess(
      schema,
      "2",
      BigDecimal.normalize(BigDecimal.make(2n, 0))
    )
    await Util.expectParseSuccess(
      schema,
      "0.123",
      BigDecimal.normalize(BigDecimal.make(123n, 3))
    )
    await Util.expectParseSuccess(
      schema,
      "",
      BigDecimal.normalize(BigDecimal.make(0n, 0))
    )
    await Util.expectParseFailure(
      schema,
      "abc",
      `Expected string <-> BigDecimal, actual "abc"`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(2n, 0),
      "2"
    )
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(123n, 3),
      "0.123"
    )
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(0n, 0),
      "0"
    )
  })
})
