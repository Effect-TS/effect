import { BigDecimal } from "effect"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { assertFalse, assertTrue, strictEqual } from "effect/test/util"
import { describe, it } from "vitest"

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
    const pretty = Pretty.make(schema)

    strictEqual(pretty(BigDecimal.fromNumber(123)), "BigDecimal(123)")
    strictEqual(pretty(BigDecimal.unsafeFromString("123.100")), "BigDecimal(123.1)")
    strictEqual(pretty(BigDecimal.unsafeFromString("")), "BigDecimal(0)")
  })

  it("equivalence", () => {
    const schema = S.BigDecimalFromSelf
    const equivalence = S.equivalence(schema)

    assertTrue(equivalence(BigDecimal.fromNumber(1), BigDecimal.unsafeFromString("1")))
    assertFalse(equivalence(BigDecimal.fromNumber(2), BigDecimal.unsafeFromString("1")))
    assertFalse(equivalence(BigDecimal.fromNumber(1), BigDecimal.unsafeFromString("2")))
  })
})
