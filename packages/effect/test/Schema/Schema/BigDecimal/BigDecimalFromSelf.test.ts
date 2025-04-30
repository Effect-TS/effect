import { describe, it } from "@effect/vitest"
import { assertFalse, assertTrue } from "@effect/vitest/utils"
import { BigDecimal } from "effect"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("BigDecimalFromSelf", () => {
  const schema = S.BigDecimalFromSelf

  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(schema)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(schema, BigDecimal.make(0n, 0), BigDecimal.make(0n, 0))
    await Util.assertions.decoding.succeed(schema, BigDecimal.make(123n, 5), BigDecimal.make(123n, 5))
    await Util.assertions.decoding.succeed(
      schema,
      BigDecimal.make(-20000000n, 0),
      BigDecimal.make(-20000000n, 0)
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(schema, BigDecimal.make(0n, 0), BigDecimal.make(0n, 0))
    await Util.assertions.encoding.succeed(schema, BigDecimal.make(123n, 5), BigDecimal.make(123n, 5))
    await Util.assertions.encoding.succeed(
      schema,
      BigDecimal.make(-20000000n, 0),
      BigDecimal.make(-20000000n, 0)
    )
  })

  it("pretty", () => {
    const schema = S.BigDecimalFromSelf

    Util.assertions.pretty(schema, BigDecimal.fromNumber(123), "BigDecimal(123)")
    Util.assertions.pretty(schema, BigDecimal.unsafeFromString("123.100"), "BigDecimal(123.1)")
    Util.assertions.pretty(schema, BigDecimal.unsafeFromString(""), "BigDecimal(0)")
  })

  it("equivalence", () => {
    const schema = S.BigDecimalFromSelf
    const equivalence = S.equivalence(schema)

    assertTrue(equivalence(BigDecimal.fromNumber(1), BigDecimal.unsafeFromString("1")))
    assertFalse(equivalence(BigDecimal.fromNumber(2), BigDecimal.unsafeFromString("1")))
    assertFalse(equivalence(BigDecimal.fromNumber(1), BigDecimal.unsafeFromString("2")))
  })
})
