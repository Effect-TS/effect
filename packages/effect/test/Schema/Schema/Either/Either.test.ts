import * as E from "effect/Either"
import * as S from "effect/Schema"
import * as Util from "effect/test/Schema/TestUtils"
import { describe, it } from "vitest"

describe("Either", () => {
  it("property tests", () => {
    Util.roundtrip(S.Either({ left: S.String, right: S.Number }))
  })

  it("decoding", async () => {
    const schema = S.Either({ left: S.String, right: S.NumberFromString })
    await Util.expectDecodeUnknownSuccess(
      schema,
      JSON.parse(JSON.stringify(E.left("a"))),
      E.left("a")
    )
    await Util.expectDecodeUnknownSuccess(
      schema,
      JSON.parse(JSON.stringify(E.right("1"))),
      E.right(1)
    )
  })

  it("encoding", async () => {
    const schema = S.Either({ left: S.String, right: S.NumberFromString })
    await Util.expectEncodeSuccess(schema, E.left("a"), { _tag: "Left", left: "a" })
    await Util.expectEncodeSuccess(schema, E.right(1), { _tag: "Right", right: "1" })
  })
})
