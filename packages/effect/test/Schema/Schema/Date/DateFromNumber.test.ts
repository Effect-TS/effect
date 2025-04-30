import { describe, it } from "@effect/vitest"
import { assertTrue, strictEqual } from "@effect/vitest/utils"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("DateFromNumber", () => {
  it("decoding", async () => {
    await Util.assertions.decoding.succeed(S.DateFromNumber, 0, new Date(0))
    assertTrue(S.decodeSync(S.DateFromNumber)(NaN) instanceof Date)
    assertTrue(S.decodeSync(S.DateFromNumber)(Infinity) instanceof Date)
    assertTrue(S.decodeSync(S.DateFromNumber)(-Infinity) instanceof Date)

    await Util.assertions.decoding.fail(
      S.DateFromNumber,
      null,
      `DateFromNumber
└─ Encoded side transformation failure
   └─ Expected number, actual null`
    )
  })

  it("encoding", async () => {
    await Util.assertions.encoding.succeed(S.DateFromNumber, new Date(0), 0)
    strictEqual(S.encodeSync(S.DateFromNumber)(new Date("invalid")), NaN)
    strictEqual(S.encodeSync(S.DateFromNumber)(new Date(NaN)), NaN)
    strictEqual(S.encodeSync(S.DateFromNumber)(new Date(Infinity)), NaN)
    strictEqual(S.encodeSync(S.DateFromNumber)(new Date(-Infinity)), NaN)
  })
})
