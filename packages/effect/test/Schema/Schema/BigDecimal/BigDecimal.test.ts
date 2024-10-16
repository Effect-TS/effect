import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("BigDecimal", () => {
  const schema = S.BigDecimal

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(
      schema,
      "2",
      BigDecimal.normalize(BigDecimal.make(2n, 0))
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      "0.123",
      BigDecimal.normalize(BigDecimal.make(123n, 3))
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      "",
      BigDecimal.normalize(BigDecimal.make(0n, 0))
    )
    await Util.expectDecodeUnknownFailure(
      schema,
      "abc",
      `BigDecimal
└─ Transformation process failure
   └─ Expected BigDecimal, actual "abc"`
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
