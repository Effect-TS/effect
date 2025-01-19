import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("BigDecimal", () => {
  const schema = S.BigDecimal

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      "2",
      BigDecimal.normalize(BigDecimal.make(2n, 0))
    )
    await Util.assertions.decoding.succeed(
      schema,
      "0.123",
      BigDecimal.normalize(BigDecimal.make(123n, 3))
    )
    await Util.assertions.decoding.succeed(
      schema,
      "",
      BigDecimal.normalize(BigDecimal.make(0n, 0))
    )
    await Util.assertions.decoding.fail(
      schema,
      "abc",
      `BigDecimal
└─ Transformation process failure
   └─ Unable to decode "abc" into a BigDecimal`
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
