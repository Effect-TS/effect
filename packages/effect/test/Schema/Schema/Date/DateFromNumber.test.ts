import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, expect, it } from "vitest"

describe("DateFromNumber", () => {
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(S.DateFromNumber, 0, new Date(0))
    expect(S.decodeSync(S.DateFromNumber)(NaN) instanceof Date).toBe(true)
    expect(S.decodeSync(S.DateFromNumber)(Infinity) instanceof Date).toBe(true)
    expect(S.decodeSync(S.DateFromNumber)(-Infinity) instanceof Date).toBe(true)

    await Util.assertions.decoding.fail(
      S.DateFromNumber,
      null,
      `DateFromNumber
└─ Encoded side transformation failure
   └─ Expected number, actual null`
    )
  })

  it("encoding", async () => {
    await Util.expectEncodeSuccess(S.DateFromNumber, new Date(0), 0)
    expect(S.encodeSync(S.DateFromNumber)(new Date("invalid"))).toBe(NaN)
    expect(S.encodeSync(S.DateFromNumber)(new Date(NaN))).toBe(NaN)
    expect(S.encodeSync(S.DateFromNumber)(new Date(Infinity))).toBe(NaN)
    expect(S.encodeSync(S.DateFromNumber)(new Date(-Infinity))).toBe(NaN)
  })
})
