import * as Equivalence from "@effect/schema/Equivalence"
import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import { BigDecimal } from "effect"
import { describe, expect, it } from "vitest"

describe("BigDecimal/BigDecimalFromSelf", () => {
  const schema = S.BigDecimalFromSelf

  it("property tests", () => {
    Util.roundtrip(schema)
  })

  it("decoding", async () => {
    await Util.expectParseSuccess(schema, BigDecimal.make(0n, 0), BigDecimal.make(0n, 0))
    await Util.expectParseSuccess(schema, BigDecimal.make(123n, 5), BigDecimal.make(123n, 5))
    await Util.expectParseSuccess(
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
    const pretty = Pretty.to(schema)

    expect(pretty(BigDecimal.fromNumber(123))).toEqual("BigDecimal(123)")
    expect(pretty(BigDecimal.unsafeFromString("123.100"))).toEqual("BigDecimal(123.1)")
    expect(pretty(BigDecimal.unsafeFromString(""))).toEqual("BigDecimal(0)")
  })

  it("equivalence", () => {
    const schema = S.BigDecimalFromSelf
    const equivalence = Equivalence.to(schema)

    expect(equivalence(BigDecimal.fromNumber(1), BigDecimal.unsafeFromString("1"))).to.be.true
    expect(equivalence(BigDecimal.fromNumber(2), BigDecimal.unsafeFromString("1"))).to.be.false
    expect(equivalence(BigDecimal.fromNumber(1), BigDecimal.unsafeFromString("2"))).to.be.false
  })
})
