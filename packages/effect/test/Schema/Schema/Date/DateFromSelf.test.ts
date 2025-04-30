import { describe, it } from "@effect/vitest"
import * as S from "effect/Schema"
import * as Util from "../../TestUtils.js"

describe("DateFromSelf", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.DateFromSelf)
  })

  it("decoding", async () => {
    await Util.assertions.decoding.succeed(S.DateFromSelf, new Date(0), new Date(0))
    await Util.assertions.decoding.succeed(S.DateFromSelf, new Date("invalid"))

    await Util.assertions.decoding.fail(
      S.DateFromSelf,
      null,
      `Expected DateFromSelf, actual null`
    )
  })

  it("encoding", async () => {
    const now = new Date()
    await Util.assertions.encoding.succeed(S.DateFromSelf, now, now)
    const invalid = new Date("invalid")
    await Util.assertions.encoding.succeed(S.DateFromSelf, invalid, invalid)
  })

  it("pretty", () => {
    const schema = S.DateFromSelf
    Util.assertions.pretty(schema, new Date(0), `new Date("1970-01-01T00:00:00.000Z")`)
  })
})
