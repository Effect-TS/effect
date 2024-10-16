import * as FiberId from "effect/FiberId"
import * as Pretty from "effect/Pretty"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("FiberIdFromSelf", () => {
  it("arbitrary", () => {
    Util.expectArbitrary(S.FiberIdFromSelf)
  })

  it("property tests", () => {
    Util.roundtrip(S.FiberIdFromSelf)
  })

  it("decoding", async () => {
    const schema = S.FiberIdFromSelf

    await Util.expectDecodeUnknownSuccess(schema, FiberId.none)
    await Util.expectDecodeUnknownSuccess(schema, FiberId.runtime(1, 100))
    await Util.expectDecodeUnknownSuccess(schema, FiberId.composite(FiberId.none, FiberId.none))

    await Util.expectDecodeUnknownFailure(
      schema,
      null,
      `Expected FiberIdFromSelf, actual null`
    )
  })

  it("pretty", () => {
    const schema = S.FiberIdFromSelf
    const pretty = Pretty.make(schema)
    expect(pretty(FiberId.none)).toEqual(`FiberId.none`)
    expect(pretty(FiberId.runtime(1, 100))).toEqual(`FiberId.runtime(1, 100)`)
    expect(pretty(FiberId.composite(FiberId.none, FiberId.none))).toEqual(
      `FiberId.composite(FiberId.none, FiberId.none)`
    )
  })
})
