import * as O from "effect/Option"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Option", () => {
  it("test roundtrip consistency", () => {
    Util.assertions.testRoundtripConsistency(S.Option(S.Number))
  })

  it("decoding", async () => {
    const schema = S.Option(S.NumberFromString)
    await Util.expectDecodeUnknownSuccess(schema, JSON.parse(JSON.stringify(O.none())), O.none())
    await Util.expectDecodeUnknownSuccess(schema, JSON.parse(JSON.stringify(O.some("1"))), O.some(1))
  })

  it("encoding", async () => {
    const schema = S.Option(S.NumberFromString)
    await Util.expectEncodeSuccess(schema, O.none(), { _tag: "None" })
    await Util.expectEncodeSuccess(schema, O.some(1), { _tag: "Some", value: "1" })
  })
})
