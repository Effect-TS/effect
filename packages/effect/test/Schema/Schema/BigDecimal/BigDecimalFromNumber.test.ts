import { describe, it } from "@effect/vitest"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("BigDecimalFromNumber", () => {
  const schema = S.BigDecimalFromNumber

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(
      schema,
      2,
      BigDecimal.make(2n, 0)
    )
    await Util.assertions.decoding.succeed(
      schema,
      0.123,
      BigDecimal.make(123n, 3)
    )
    await Util.assertions.decoding.succeed(
      schema,
      0,
      BigDecimal.make(0n, 0)
    )
    await Util.assertions.decoding.fail(
      schema,
      "abc",
      `BigDecimalFromNumber
└─ Encoded side transformation failure
   └─ Expected number, actual "abc"`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(
      schema,
      BigDecimal.make(2n, 0),
      2
    )
    await Util.assertions.encoding.succeed(
      schema,
      BigDecimal.make(123n, 3),
      0.123
    )
    await Util.assertions.encoding.succeed(
      schema,
      BigDecimal.make(0n, 0),
      0
    )
  })
})
