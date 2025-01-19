import { BigDecimal } from "effect"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("BigDecimalFromSelf", () => {
  const schema = S.BigDecimalFromSelf

  it("property tests", () => {
    Util.assertions.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectDecodeUnknownSuccess(schema, BigDecimal.make(0n, 0), BigDecimal.make(0n, 0))
    await Util.expectDecodeUnknownSuccess(schema, BigDecimal.make(123n, 5), BigDecimal.make(123n, 5))
    await Util.expectDecodeUnknownSuccess(
      schema,
      BigDecimal.make(-20000000n, 0),
      BigDecimal.make(-20000000n, 0)
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(schema, BigDecimal.make(0n, 0), BigDecimal.make(0n, 0))
    await Util.expectEncodeSuccess(schema, BigDecimal.make(123n, 5), BigDecimal.make(123n, 5))
    await Util.expectEncodeSuccess(
      schema,
      BigDecimal.make(-20000000n, 0),
      BigDecimal.make(-20000000n, 0)
    )
  })

  it("pretty", () => {
    const schema = S.BigDecimalFromSelf
    const pretty = Pretty.make(schema)

    expect(pretty(BigDecimal.fromNumber(123))).toEqual("BigDecimal(123)")
    expect(pretty(BigDecimal.unsafeFromString("123.100"))).toEqual("BigDecimal(123.1)")
    expect(pretty(BigDecimal.unsafeFromString(""))).toEqual("BigDecimal(0)")
  })

  it("equivalence", () => {
    const schema = S.BigDecimalFromSelf
    const equivalence = S.equivalence(schema)

    expect(equivalence(BigDecimal.fromNumber(1), BigDecimal.unsafeFromString("1"))).toBe(true)
    expect(equivalence(BigDecimal.fromNumber(2), BigDecimal.unsafeFromString("1"))).toBe(false)
    expect(equivalence(BigDecimal.fromNumber(1), BigDecimal.unsafeFromString("2"))).toBe(false)
  })
})
