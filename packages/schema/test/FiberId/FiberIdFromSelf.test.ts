import * as Pretty from "@effect/schema/Pretty"
import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/util"
import * as FiberId from "effect/FiberId"
import { describe, expect, it } from "vitest"

describe("FiberIdFromSelf", () => {
  it("property tests", () => {
    Util.roundtrip(S.FiberIdFromSelf)
  })

  it("decoding", async () => {
    const schema = S.FiberIdFromSelf

    await Util.expectParseSuccess(schema, FiberId.none)
    await Util.expectParseSuccess(schema, FiberId.runtime(1, 100))
    await Util.expectParseSuccess(schema, FiberId.composite(FiberId.none, FiberId.none))

    await Util.expectParseFailure(schema, null, `Expected FiberId, actual null`)
  })

  it("pretty", () => {
    const schema = S.FiberIdFromSelf
    const pretty = Pretty.to(schema)
    expect(pretty(FiberId.none)).toEqual(`FiberId.none`)
    expect(pretty(FiberId.runtime(1, 100))).toEqual(`FiberId.runtime(1, 100)`)
    expect(pretty(FiberId.composite(FiberId.none, FiberId.none))).toEqual(
      `FiberId.composite(FiberId.none, FiberId.none)`
    )
  })
})
